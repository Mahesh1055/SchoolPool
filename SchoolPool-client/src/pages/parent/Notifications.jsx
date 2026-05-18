import { useEffect,useState } from "react";
import { getNotifications } from "../../services/notificationService";

export default function Notifications(){
  const [data,setData]=useState([]);
  useEffect(()=>{getNotifications().then(r=>setData(r.data))},[]);
  return data.map(n=><div key={n.notificationId}>{n.message}</div>);
}