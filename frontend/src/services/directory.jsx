import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BUSINESS_ROLES, businessName, getReadContract, listDrivers, listRoleAssignments, loadBusinessNames } from './contractService';

const emptyAssignments = Object.fromEntries(BUSINESS_ROLES.map(role => [role, []]));
const ownedDrivers = (items,owner) => items.filter(driver => String(driver.transport || '').toLowerCase() === owner.toLowerCase());
const Directory = createContext({assignments:emptyAssignments,names:{},loading:false,error:'',drivers:[],driverOwner:null,driversLoading:false,driversError:'',refresh:() => {},refreshDrivers:() => {},updateName:() => {},updateRole:() => {}});
export const useDirectory = () => useContext(Directory);

export function DirectoryProvider({contextKey,address,children}) {
  const [directory,setDirectory] = useState({assignments:emptyAssignments,names:{},loading:true,error:''});
  const [drivers,setDrivers] = useState({address:null,items:[],loading:false,error:''});
  const [revision,setRevision] = useState(0);
  const previousContext = useRef(contextKey);
  const driverRequest = useRef(0);
  const currentScope = useRef({address,contextKey}); currentScope.current = {address,contextKey};
  const refresh = useCallback(() => setRevision(value => value + 1),[]);
  const refreshDrivers = useCallback(async () => {
    if (!address) return;
    const request = ++driverRequest.current;
    setDrivers(value => ({address,items:value.address === address ? value.items : [],loading:true,error:''}));
    try {
      const items = await listDrivers(address);
      if (request === driverRequest.current && currentScope.current.address === address && currentScope.current.contextKey === contextKey) setDrivers({address,items:ownedDrivers(items,address),loading:false,error:''});
    } catch (error) {
      if (request === driverRequest.current && currentScope.current.address === address && currentScope.current.contextKey === contextKey) setDrivers(value => ({...value,loading:false,error:'Driver list could not be refreshed.'}));
      throw error;
    }
  },[address,contextKey]);
  const updateName = useCallback((account,name) => setDirectory(value => ({...value,names:{...value.names,[account.toLowerCase()]:name}})),[]);
  const updateRole = useCallback((role,account,enabled) => setDirectory(value => {
    const existing = value.assignments[role] || [];
    const accounts = enabled ? (existing.some(item => item.toLowerCase() === account.toLowerCase()) ? existing : [...existing,account]) : existing.filter(item => item.toLowerCase() !== account.toLowerCase());
    return {...value,assignments:{...value.assignments,[role]:accounts}};
  }),[]);

  useEffect(() => {
    let active = true;
    if (previousContext.current !== contextKey) {
      previousContext.current = contextKey;
      setDirectory({assignments:emptyAssignments,names:{},loading:true,error:''});
    } else setDirectory(value => ({...value,loading:true,error:''}));
    (async () => {
      const contract = await getReadContract();
      const assignments = await listRoleAssignments(contract);
      const names = await loadBusinessNames(Object.values(assignments).flat(),contract);
      if (active) setDirectory({assignments,names,loading:false,error:''});
    })().catch(error => { console.warn('Account directory refresh failed',error); if (active) setDirectory({assignments:emptyAssignments,names:{},loading:false,error:'Account directory could not be refreshed.'}); });
    return () => { active = false; };
  },[contextKey,revision]);

  useEffect(() => {
    let active = true;
    const request = ++driverRequest.current;
    setDrivers({address,items:[],loading:Boolean(address),error:''});
    if (address) listDrivers(address).then(items => {
      if (active && request === driverRequest.current) setDrivers({address,items:ownedDrivers(items,address),loading:false,error:''});
    }).catch(error => {
      if (active && request === driverRequest.current) setDrivers({address,items:[],loading:false,error:'Driver list could not be refreshed.'});
    });
    return () => { active = false; };
  },[address,contextKey]);

  useEffect(() => {
    const onFocus = () => { refresh(); void refreshDrivers().catch(() => {}); };
    window.addEventListener('focus',onFocus);
    return () => window.removeEventListener('focus',onFocus);
  },[refresh,refreshDrivers]);

  const value = useMemo(() => ({...directory,drivers:drivers.address === address ? drivers.items : [],driverOwner:address,driversLoading:drivers.address === address && drivers.loading,driversError:drivers.address === address ? drivers.error : '',refresh,refreshDrivers,updateName,updateRole}),[directory,drivers,address,refresh,refreshDrivers,updateName,updateRole]);
  return <Directory.Provider value={value}>{children}</Directory.Provider>;
}

export function useRoleOptions(role) {
  const directory = useDirectory();
  return {options:(directory.assignments[role] || []).map(account => ({value:account,label:businessName(account,directory.names)})),loading:directory.loading,error:directory.error};
}

export function useDrivers(address) {
  const directory = useDirectory();
  const ownsList = address && directory.driverOwner && address.toLowerCase() === directory.driverOwner.toLowerCase();
  return {drivers:ownsList ? directory.drivers : [],loading:ownsList && directory.driversLoading,error:ownsList ? directory.driversError : '',refresh:directory.refreshDrivers};
}
