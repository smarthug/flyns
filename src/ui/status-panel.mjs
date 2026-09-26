import {HTTPRPC, WalletRPC} from '../ens/rpc.mjs';
import {StatusENS, STATUS_KEY, PROTECTED_KEYS} from '../ens/status.mjs';

export function mountStatusPanel({config, target, run, journal}) {
  const $ = id => document.getElementById(id);
  const ens = new StatusENS(new HTTPRPC(target.rpcUrl), config, target);
  let state = null, wallet = null, selectionValid = false;
  const same = (a,b) => a?.toLowerCase() === b?.toLowerCase();
  const providers = [];
  window.addEventListener('eip6963:announceProvider', event => providers.push(event.detail));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const provider = () => providers.find(p => p.info?.rdns === 'io.metamask')?.provider || window.ethereum;
  const log = (label, data = {}) => journal(label, {...data, mode:'sepolia', subject:target.name});
  const message = text => { $('adaResult').textContent = text; };
  const act = action => run(async () => {
    try { await action(); }
    catch (error) { state = null; message(error.message + ' Refresh live records before continuing.'); throw error; }
  });
  function invalidate() { selectionValid = false; render(); }
  function render() {
    const busy = document.body.classList.contains('is-busy');
    const restricted = state && state.rootRoles === 0n && [0n,16n].includes(state.statusRoles) && PROTECTED_KEYS.every(k => !state.permissions[k]);
    const owner = selectionValid && same(wallet?.account,target.owner), runtime = selectionValid && same(wallet?.account,target.runtime);
    $('adaGrant').disabled = busy || !owner || !restricted || !state.ownerHasAdmin || state.permissions[STATUS_KEY];
    $('adaWrite').disabled = busy || !runtime || !restricted || !state.permissions[STATUS_KEY] || $('adaNextStatus').value === state.records[STATUS_KEY];
    $('adaWallet').textContent = wallet ? `Connected: ${wallet.account}${selectionValid ? ' · Sepolia 11155111' : ' · account/network changed; reconnect'}` : 'No wallet connected. Reading and permission checks need no wallet.';
    $('adaReadState').textContent = state ? `Read from Sepolia · block ${state.blockNumber.toLocaleString('en-US')}` : 'Live records not loaded';
    for (const [id,key] of [['adaStatus',STATUS_KEY],['adaModel','flyns.model'],['adaType','agent.type']]) $(id).textContent = state ? state.records[key] || '(empty)' : '—';
    $('adaPermission').textContent = !state ? 'Unchecked' : !restricted ? 'Broader rights found — review required' : state.permissions[STATUS_KEY] ? 'Status allowed · model & checkpoint denied' : 'Status not granted · model & checkpoint denied';
    $('adaPermission').className = state && restricted ? 'yes' : 'micro';
  }
  async function refresh() {
    state = null; render();
    state = await ens.snapshot();
    ens.assertRestricted(state);
    message(state.permissions[STATUS_KEY] ? 'The runtime can update flyns.status. Model and checkpoint permissions are separate.' : 'No status permission is active. Connect the owner to grant this key only.');
    log('Ada live records resolved', {detail:`${state.records[STATUS_KEY] || '(empty status)'} · block ${state.blockNumber}`});
  }
  async function connect(expected) {
    const selected = provider();
    if (!selected) throw new Error('Open this app in a browser with MetaMask to connect a wallet');
    selectionValid = false;
    wallet = new WalletRPC(selected, event => log(`${event.kind.toUpperCase()} · ${event.label}`, event));
    await wallet.connect({expectedAccount:expected});
    selected.on?.('accountsChanged', invalidate); selected.on?.('chainChanged', invalidate);
    selectionValid = true;
    await refresh();
  }
  $('adaName').textContent = target.name;
  $('adaResolver').textContent = target.resolver;
  $('adaOwner').textContent = target.owner;
  $('adaRuntime').textContent = target.runtime;
  for (const [id,hash] of [['adaGrantReceipt',target.grantTransaction],['adaStatusReceipt',target.statusTransaction]]) {
    $(id).href = `https://sepolia.etherscan.io/tx/${hash}`;
  }
  $('adaRefresh').onclick = () => act(refresh);
  $('adaConnectRuntime').onclick = () => act(() => connect(target.runtime));
  $('adaConnectOwner').onclick = () => act(() => connect(target.owner));
  $('adaVerify').onclick = () => act(async () => {
    const result = await ens.verify(); state = result.state;
    message(`${result.probes[0].allowed ? 'Status write allowed' : 'Status write denied'} · model write denied (EACUnauthorizedAccountRoles). These are read-only eth_call checks, not submitted transactions.`);
    log('Ada status/model permissions verified (eth_call)', {detail:'No model transaction was sent', probes:result.probes, block:state.blockNumber});
  });
  $('adaGrant').onclick = () => act(async () => {
    const result = await ens.grant(wallet); state = result.state;
    message(result.skipped ? 'Status permission is already active. No duplicate transaction was sent.' : 'Status permission granted and read back. No checkpoint or admin rights were granted.');
  });
  $('adaWrite').onclick = () => act(async () => {
    const result = await ens.update(wallet, $('adaNextStatus').value); state = result.state;
    message(result.skipped ? 'This status is already stored. No duplicate transaction was sent.' : `Confirmed on Sepolia: ${state.records[STATUS_KEY]}. Protected records are unchanged.`);
  });
  $('adaNextStatus').oninput = render;
  render();
  return {render};
}
