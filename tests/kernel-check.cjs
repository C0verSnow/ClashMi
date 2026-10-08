// 仅由 GitHub Actions 执行。用官方预编译内核检查配置，不建立 VPN 或登录 Tailscale。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const directory = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP, 'clashmi-'));
const source = fs.readFileSync('raw.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
function reality(name, shortId) {
  return { name, type: 'vless', server: '127.0.0.1', port: 443,
    uuid: '00000000-0000-4000-8000-000000000001', tls: true,
    'client-fingerprint': 'chrome', servername: 'example.com',
    'reality-opts': { 'public-key': 'uIknU_LPpxh4L8j5O7ZK6yjQzQHdR4y9sWD2aR-XxUY', 'short-id': shortId } };
}
function check(name, config) {
  const file = path.join(directory, name + '.json');
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  const result = spawnSync(process.env.MIHOMO_BINARY, ['-t', '-d', directory, '-f', file],
    { encoding: 'utf8', timeout: 30000 });
  if (result.error) throw result.error;
  console.log(name + '\n' + result.stdout + result.stderr);
  return result;
}
try {
  // 正常节点排在前面，避免只测了第一个节点的情况。
  for (const [i, shortId] of ['ab\n', 'abc', 'gg', '001122334455667788'].entries()) {
    const input = { mode: 'rule', proxies: [reality('good', '0011223344556677'), reality('bad', shortId)],
      'proxy-groups': [
        { name: 'choose', type: 'select', proxies: ['bad', 'good'] },
        { name: 'only-bad', type: 'select', proxies: ['bad'] }
      ], rules: ['MATCH,choose'] };
    const before = check('before-' + i, input);
    assert.notEqual(before.status, 0, '坏 ID 必须复现启动失败');
    assert.match(before.stdout + before.stderr, /invalid REALITY short (?:ID|id)/);
    const output = context.main(input);
    assert.equal(check('after-' + i, output).status, 0, '修复后的完整配置必须通过内核检查');
    assert.equal(check('twice-' + i, context.main(output)).status, 0, '重复加载也必须通过');
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
