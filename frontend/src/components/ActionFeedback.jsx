import React, { useEffect, useState } from 'react';

// Role action forms unmount once the status advances, so the confirmation is kept here until another product is selected.
export function useActionFeedback(product,refreshProduct,contextKey) {
  const [notice,setNotice] = useState(null);
  const id = product?.productId?.toString();
  useEffect(() => { setNotice(null); },[id]);
  const complete = text => async () => {
    await refreshProduct?.(product.productId,contextKey);
    setNotice({text,previousStatus:Number(product.currentStatus)});
  };
  // The form owns feedback while it is still mounted. This notice takes over once
  // the refreshed shipment status has replaced that form.
  return [notice && product && Number(product.currentStatus) !== notice.previousStatus ? notice.text : '',complete];
}

export function ActionNotice({text}) {
  return text ? <p className="notice-success" role="status">{text}</p> : null;
}
