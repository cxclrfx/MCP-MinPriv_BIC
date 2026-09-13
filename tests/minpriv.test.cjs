const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'inline script not found');

function harness() {
  const elements = new Map();
  const makeEl = id => ({ id, hidden:true, disabled:true, textContent:'', innerHTML:'', files:[], addEventListener(type,fn){this[type]=fn;}, click(){}, remove(){} });
  const document = {
    getElementById(id){ if(!elements.has(id)) elements.set(id, makeEl(id)); return elements.get(id); },
    createElement(){ return makeEl('generated'); }
  };
  const ctx = vm.createContext({ console:{log:console.log,error(){}}, document, alert(){}, Blob, URL: class extends URL { static createObjectURL(){return 'blob:test'} static revokeObjectURL(){} }, setTimeout(fn){fn();} });
  vm.runInContext(script + '\n;globalThis.__api={extractCalls,extractCatalog,safeEventSummary,analyzeData,invalidateReport,analyze,download};', ctx);
  return { api:ctx.__api, elements };
}

test('sample workload produces catalog-constrained allowlist',()=>{
  const {api}=harness();
  const logs=[
    {type:'tool_use',name:'files.read',input:{path:'README.md'}},
    {type:'tool_use',name:'github.search_code',input:{query:'rateLimit'}},
    {method:'tools/call',params:{name:'files.read',arguments:{path:'INSTRUCTIONS.md'}}},
    {type:'tool_use',name:'shell.exec',input:{command:'npm test'}},
    {tool_name:'github.search_code',args:{query:'Retry-After'}}
  ];
  const catalog={tools:[{name:'files.read'},{name:'files.write'},{name:'github.search_code'},{name:'github.push'},{name:'github.delete_repo'},{name:'shell.exec'},{name:'secrets.read_token'},{name:'payments.transfer'}]};
  const out=api.analyzeData(logs,catalog);
  assert.equal(out.calls.length,5);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.allowedTools).sort(),['files.read','github.search_code','shell.exec']);
  assert.equal(out.policyObj.proposed_policy.deniedOrUnobservedTools.length,5);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.observedOutsideCatalog),[]);
});

test('observed name outside catalog is reported but not allowed',()=>{
  const {api}=harness();
  const out=api.analyzeData([{type:'tool_use',name:'outside.catalog'}],{tools:[{name:'files.read'}]});
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.allowedTools),[]);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.observedOutsideCatalog),['outside.catalog']);
});

test('without catalog the policy remains observed-use only',()=>{
  const {api}=harness();
  const out=api.analyzeData([{type:'tool_use',name:'files.read'}],null);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.allowedTools),['files.read']);
});

test('T_nested_payload_data_is_not_invocation',()=>{
  const {api}=harness();
  const calls=api.extractCalls({type:'tool_use',name:'files.read',input:{tool_name:'synthetic.nested',secret:'value'}});
  assert.equal(calls.length,1);
  assert.equal(calls[0].name,'files.read');
});

test('safe event summary does not expose argument values',()=>{
  const {api}=harness();
  const s=api.safeEventSummary({type:'tool_use',name:'files.read',input:{path:'private-value',other:'hidden-value'}});
  assert.match(s,/files\.read/);
  assert.doesNotMatch(s,/private-value|hidden-value/);
  assert.match(s,/input_keys/);
});

test('log traversal depth overflow fails closed',()=>{
  const {api}=harness(); let v={type:'tool_use',name:'files.read'}; for(let i=0;i<45;i++) v={wrap:v};
  assert.throws(()=>api.extractCalls(v),/depth limit exceeded/);
});

test('catalog traversal depth overflow fails closed',()=>{
  const {api}=harness(); let v={name:'files.read'}; for(let i=0;i<35;i++) v={tools:v};
  assert.throws(()=>api.extractCatalog(v),/depth limit exceeded/);
});

test('input invalidation clears stale report UI',()=>{
  const {api,elements}=harness(); api.invalidateReport();
  const result=elements.get('result'), download=elements.get('download'), policy=elements.get('policy');
  result.hidden=false; download.disabled=false; policy.textContent='old';
  api.invalidateReport();
  assert.equal(result.hidden,true); assert.equal(download.disabled,true); assert.equal(policy.textContent,'');
});

test('empty supplied catalogs allow nothing and retain zero evidence',()=>{
 const {api}=harness();
 for(const catalog of [[],{tools:[]},{functions:[]}]){
  const out=api.analyzeData([{tool_name:'outside.catalog'}],catalog);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.allowedTools),[]);
  assert.deepEqual(Array.from(out.policyObj.proposed_policy.observedOutsideCatalog),['outside.catalog']);
  assert.equal(out.policyObj.evidence.catalog_tools,0);
 }
});
test('MCP params and function payloads are opaque while sibling calls remain visible',()=>{
 const {api}=harness();
 const out=api.extractCalls([
  {method:'tools/call',params:{name:'files.read',arguments:{tool_name:'synthetic.nested'}}},
  {type:'function_call',function:{name:'files.write',arguments:{tool_name:'synthetic.nested'}}},
  {tool_name:'github.search_code'}
 ]);
 assert.deepEqual(Array.from(out,c=>c.name),['files.read','files.write','github.search_code']);
});
test('catalog parameter schemas cannot introduce tool names',()=>{
 const {api}=harness();
 const catalog={tools:[{name:'files.read',inputSchema:{properties:{tools:{name:'outside.catalog'}}}}]};
 const out=api.analyzeData([{tool_name:'outside.catalog'}],catalog);
 assert.deepEqual(Array.from(out.catalog),['files.read']);
 assert.deepEqual(Array.from(out.policyObj.proposed_policy.allowedTools),[]);
 assert.throws(()=>api.extractCatalog({unexpected:{name:'outside.catalog'}}),/Unsupported/);
});
test('valid catalog forms preserve names and empty descriptor names fail',()=>{
 const {api}=harness();
 assert.deepEqual(Array.from(api.extractCatalog({servers:{one:{tools:[' files.read ','files.read']},two:{functions:[{type:'function',function:{name:'files.write'}}]}}})),['files.read','files.write']);
 assert.throws(()=>api.extractCatalog({tools:[{name:' '}]}),/Empty/);
});
const fileOf=data=>({text:async()=>JSON.stringify(data)});
async function select(h,kind,file){
 const el=h.elements.get(kind);el.files=file?[file]:[];await el.change();
}
test('invalid catalog blocks analysis and does not display raw parse input',async()=>{
 const h=harness();
 await select(h,'logs',fileOf([{tool_name:'files.read'}]));
 h.api.analyze();assert.equal(h.elements.get('download').disabled,false);
 await select(h,'catalog',{text:async()=>'{synthetic-sensitive-value'});
 assert.equal(h.elements.get('analyze').disabled,true);
 assert.equal(h.elements.get('download').disabled,true);
 assert.doesNotMatch(h.elements.get('catalogInfo').textContent,/synthetic-sensitive-value/);
 h.api.analyze();assert.equal(h.elements.get('download').disabled,true);
 assert.throws(()=>h.api.download(),/No current report/);
 await select(h,'catalog',fileOf({tools:[]}));
 h.api.analyze();
 const policy=JSON.parse(h.elements.get('policy').textContent);
 assert.deepEqual(policy.proposed_policy.allowedTools,[]);
});
test('pending reads invalidate the report and older reads cannot overwrite newer inputs',async()=>{
 const h=harness();
 await select(h,'logs',fileOf([{tool_name:'files.read'}]));h.api.analyze();
 let resolve;
 const pending=select(h,'logs',{text:()=>new Promise(r=>resolve=r)});
 assert.equal(h.elements.get('analyze').disabled,true);
 assert.equal(h.elements.get('download').disabled,true);
 await select(h,'logs',fileOf([{tool_name:'files.write'}]));
 resolve(JSON.stringify([{tool_name:'synthetic.old'}]));await pending;
 h.api.analyze();
 assert.deepEqual(JSON.parse(h.elements.get('policy').textContent).proposed_policy.allowedTools,['files.write']);
});
test('older catalog errors and clearing selections do not resurrect previous state',async()=>{
 const h=harness();
 await select(h,'logs',fileOf([{tool_name:'files.read'}]));
 let reject;
 const pending=select(h,'catalog',{text:()=>new Promise((r,j)=>reject=j)});
 await select(h,'catalog',fileOf({tools:[]}));
 reject(new Error('synthetic old read failed'));await pending;
 assert.equal(h.elements.get('analyze').disabled,false);
 h.api.analyze();assert.deepEqual(JSON.parse(h.elements.get('policy').textContent).proposed_policy.allowedTools,[]);
 await select(h,'catalog',null);h.api.analyze();
 assert.deepEqual(JSON.parse(h.elements.get('policy').textContent).proposed_policy.allowedTools,['files.read']);
 await select(h,'logs',null);
 assert.equal(h.elements.get('analyze').disabled,true);
 assert.equal(h.elements.get('download').disabled,true);
});
test('repository example bytes produce the documented counts and omit argument values',()=>{
 const {api}=harness();
 const logs=fs.readFileSync(path.join(__dirname,'..','examples','sample-logs.jsonl'),'utf8').trim().split(/\r?\n/).map(x=>JSON.parse(x));
 const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'..','examples','tool-catalog.json'),'utf8'));
 const out=api.analyzeData(logs,catalog);
 assert.deepEqual([out.calls.length,out.used.length,out.catalog.length,out.unused.length,out.outsideCatalog.length],[5,3,8,5,0]);
 for(const call of out.calls)assert.doesNotMatch(call.example,/rateLimit|Retry-After|node --test|INSTRUCTIONS.md/);
 assert.equal(out.policyObj.generated_by,'MCP MinPriv_BIC');
 assert.equal(out.policyObj.application_version,'1.0.2');
});

test('T_nested_real_mcp_invocation_counts_separately',()=>{
 const {api}=harness();
 const nested={method:'tools/call',params:{name:'files.read',arguments:{path:'README.md'}}};
 const event={type:'tool_use',name:'shell.exec',input:{example:nested},children:[nested]};
 assert.deepEqual(Array.from(api.extractCalls(event),c=>c.name),['shell.exec','files.read']);
 assert.equal(api.extractCalls({type:'tool_use',name:'shell.exec',input:{example:nested}}).length,1);
 assert.equal(api.extractCalls({method:'tools/call',params:{name:'shell.exec',arguments:{example:nested}},events:[nested]}).length,2);
});

test('explicit nested invocation example counts exactly two and never traverses arguments or result',()=>{
 const {api}=harness();
 const event={
  event:'tool_call',tool:'outer_tool',
  arguments:{payload:{method:'tools/call',name:'looks_like_call_but_is_data'}},
  children:[{event:'tool_call',tool:'nested_tool',arguments:{value:123}}]
 };
 const calls=api.extractCalls(event);
 assert.equal(calls.length,2);
 assert.deepEqual(Array.from(calls,c=>c.name),['outer_tool','nested_tool']);
 for(const key of ['arguments','args','result']){
  for(const container of ['children','events','records','entries']){
   const root={[key]:{method:'tools/call',params:{name:'synthetic.data'}},[container]:[event]};
   assert.deepEqual(Array.from(api.extractCalls(root),c=>c.name),['outer_tool','nested_tool']);
  }
 }
 const withResult={...event,result:{method:'tools/call',params:{name:'synthetic.result.data'}}};
 assert.deepEqual(Array.from(api.extractCalls(withResult),c=>c.name),['outer_tool','nested_tool']);
});
