// A receipt is the source of truth for a submitted transaction. A failed read afterwards
// cannot change the transaction outcome.
export async function waitForConfirmedReceipt(tx) {
  let receipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    const status = error?.receipt?.status == null ? null : Number(error.receipt.status);
    if (error?.code === 'TRANSACTION_REPLACED' && !error.cancelled && error.receipt) receipt = error.receipt;
    else if (status === 1) receipt = error.receipt;
    else if (status === 0) throw new Error('Contract transaction reverted. No change was confirmed.',{cause:error});
    else if (error?.code === 'CALL_EXCEPTION') throw error;
    else if (error?.code === 'TRANSACTION_REPLACED' && error.cancelled) throw new Error('Transaction was cancelled or replaced. Check wallet history before retrying.');
    else throw Object.assign(new Error('Transaction confirmation could not be verified. Check wallet history before retrying.'),{code:'CONFIRMATION_UNKNOWN',cause:error});
  }
  if (!receipt) throw Object.assign(new Error('Transaction confirmation could not be verified. Check wallet history before retrying.'),{code:'CONFIRMATION_UNKNOWN'});
  if (Number(receipt.status) !== 1) throw new Error('Contract transaction reverted. No change was confirmed.');
  return receipt;
}

export async function refreshAfterConfirmation(refresh) {
  try { await refresh?.(); return false; }
  catch (error) { console.warn('Post-transaction data refresh failed',error); return true; }
}
