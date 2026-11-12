// Isolated action tests: auth, cookies and network are replaced with in-memory stubs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function compile(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  const context = {exports: {}, require: name => {
    if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
    return dependencies[name];
  }, FormData, AbortSignal, ...globals};
  vm.runInNewContext(source, context, {filename: file});
  return context.exports;
}

const identity = compile('src/lib/login-identity.ts', {});
assert.equal(identity.normalizeUsername(' Host_01 '), 'host_01');
assert.equal(identity.loginEmail(' Host_01 '), 'host_01@accounts.staycraft.invalid');
assert.equal(identity.loginEmail('HOST_01'), identity.loginEmail('host_01'));
assert.equal(identity.loginEmail('Owner@Example.com'), 'owner@example.com');
assert.equal(identity.displayLoginIdentity('host_01@accounts.staycraft.invalid'), 'host_01');
assert.equal(identity.displayLoginIdentity('owner@example.com'), 'owner@example.com');
for (const invalid of ['ab', 'a'.repeat(33), '.host', 'host.', 'ho..st', '民宿用户', 'host name', 'host+name']) {
  assert.equal(identity.normalizeUsername(invalid), null, invalid);
}

let settings = {mailer_autoconfirm: true, disable_signup: false, external: {email: true}};
let signupResponse = {data: {session: {access_token: 'isolated-test'}}, error: null};
let signInError = null;
const calls = [];
const actions = compile('src/app/login/actions.ts', {
  'next/navigation': {redirect: url => {throw new Error('redirect:' + url);}},
  '@/lib/supabase/server': {createClient: async () => ({auth: {
    signUp: async credentials => {calls.push({method: 'signup', credentials}); return signupResponse;},
    signInWithPassword: async credentials => {calls.push({method: 'signin', credentials}); return {error: signInError};},
  }})},
  '@/lib/supabase/config': {hasSupabaseConfig: () => true, supabaseConfig: () => ({url: 'https://auth.example.invalid', publishableKey: 'isolated-public-key'})},
  '@/lib/operator-sample': {operatorSample: () => false},
  '@/lib/login-identity': identity,
}, {fetch: async () => ({ok: true, json: async () => settings})});

function form(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

(async () => {
  await assert.rejects(actions.signIn(undefined, form({email: 'Host_01', password: 'password-123'})), /redirect:\/app/);
  assert.equal(calls.at(-1).credentials.email, 'host_01@accounts.staycraft.invalid');
  await assert.rejects(actions.signIn(undefined, form({email: 'Existing@Example.com', password: 'password-123'})), /redirect:\/app/);
  assert.equal(calls.at(-1).credentials.email, 'existing@example.com');
  signInError = {code: 'invalid_credentials'};
  assert.equal((await actions.signIn(undefined, form({email: 'host_01', password: 'wrong'}))).error, 'invalid');

  const registration = form({username: ' Host_01 ', password: 'password-123'});
  await assert.rejects(actions.signUp(undefined, registration), /redirect:\/app/);
  assert.equal(calls.at(-1).credentials.email, 'host_01@accounts.staycraft.invalid');
  assert.equal(calls.at(-1).credentials.options.data.username, 'host_01');
  assert.equal(calls.at(-1).credentials.options.emailRedirectTo, undefined);

  signupResponse = {data: {session: null}, error: {code: 'user_already_exists'}};
  assert.equal((await actions.signUp(undefined, registration)).error, 'taken');
  settings.mailer_autoconfirm = false;
  const before = calls.length;
  assert.equal((await actions.signUp(undefined, registration)).error, 'confirmation_required');
  assert.equal(calls.length, before, 'Confirmation requirement must be checked before account creation');
  assert.equal((await actions.signUp(undefined, form({username: 'invalid..name', password: 'password-123'}))).error, 'username');
  assert.equal((await actions.signUp(undefined, form({username: 'valid', password: 'short'}))).error, 'password');
  console.log('PASS username normalization, legacy email login, username login, immediate-session signup, duplicate username, confirmation preflight, invalid input; mocked auth only');
})().catch(error => {console.error(error); process.exitCode = 1;});
