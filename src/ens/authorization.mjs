import {decodeErrorResult} from '../../vendor/web3/viem.mjs';
import {PERMISSION_ERROR_ABI} from './official-abis.mjs';

// Wallets wrap revert bytes differently. Never infer authorization from an
// error message, JSON-RPC code 3, or an unrelated contract revert.
export function permissionDenial(error, {resource, role, account}) {
  const seen = new Set();
  function inspect(value, depth = 0) {
    if (!value || depth > 6 || seen.has(value)) return null;
    if (typeof value === 'string') {
      if (!/^0x[0-9a-fA-F]+$/.test(value)) return null;
      try {
        const decoded = decodeErrorResult({abi: PERMISSION_ERROR_ABI, data: value});
        const [actualResource, actualRole, actualAccount] = decoded.args;
        if (decoded.errorName === 'EACUnauthorizedAccountRoles' && actualResource === resource && actualRole === role && actualAccount.toLowerCase() === account?.toLowerCase()) {
          return {errorName: decoded.errorName, resource: String(actualResource), role: String(actualRole), account: actualAccount.toLowerCase(), data: value};
        }
      } catch { /* Unrelated or undecodable revert data is not evidence. */ }
      return null;
    }
    if (typeof value !== 'object') return null;
    seen.add(value);
    for (const key of ['data', 'originalError', 'error', 'cause']) {
      const match = inspect(value[key], depth + 1);
      if (match) return match;
    }
    return null;
  }
  return inspect(error);
}
