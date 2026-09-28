import React from 'react';
import { STATUSES } from '../services/contractService';

export default function StatusBadge({status}) {
  return <span className={`badge status-${Number(status)}`}>{STATUSES[Number(status)]}</span>;
}
