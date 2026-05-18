import { useEffect,useState } from "react";
import { getVehicles } from "../../services/vehicleService";

export default function Vehicles(){
  const [data,setData]=useState([]);
  useEffect(()=>{getVehicles().then(r=>setData(r.data))},[]);
  return data.map(v=><div key={v.vehicleId}>{v.vehicleNumber}</div>);
}