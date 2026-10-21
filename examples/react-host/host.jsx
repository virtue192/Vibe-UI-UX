import React,{StrictMode,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useIntentEffect as useLift} from './.generated/hover-lift/IntentEffect.jsx';
import {useIntentEffect as useLight} from './.generated/cursor-spotlight/IntentEffect.jsx';
function Card({light,lift}){const ref=useRef(null);const useEffect=light?useLight:useLift;useEffect(ref,{params:light?{lift_px:0}:{lift_px:lift}});return <button id={light?'light-target':'lift-target'} ref={ref} style={{transform:'rotate(-2deg)',padding:30,margin:20,background:'#faf3e3'}}>Existing business button</button>;}
function Host(){const [mounted,setMounted]=useState(true),[lift,setLift]=useState(3),[calls,setCalls]=useState(0);return <main onClick={e=>{if(e.target.id.endsWith('-target'))setCalls(c=>c+1);}}><h1>StrictMode / real exported hooks</h1><button id="toggle" onClick={()=>setMounted(v=>!v)}>Mount / unmount</button><button id="update" onClick={()=>setLift(v=>v===3?6:3)}>Update parameters</button><output id="calls">Business callbacks: {calls}</output>{mounted&&<><Card lift={lift}/><Card light lift={0}/></>}</main>;}
createRoot(document.querySelector('#root')).render(<StrictMode><Host/></StrictMode>);
