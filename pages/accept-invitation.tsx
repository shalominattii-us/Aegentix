import {useState} from "react";
import {useSearchParams,useNavigate} from "react-router-dom";
import {Button} from "../components/Button";
import {acceptOrganizationInvitation} from "../endpoints/organization/invitations_accept_POST.schema";
import styles from "./accept-invitation.module.css";

export default function AcceptInvitation(){
 const [params]=useSearchParams();const nav=useNavigate();const token=params.get("token")||"";const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const accept=async()=>{if(!token||busy)return;setBusy(true);setError("");setMessage("");try{const result=await acceptOrganizationInvitation(token);setMessage("Invitation accepted. Your membership role is "+result.role+".");}catch(e){setError(e instanceof Error?e.message:"Could not accept invitation. Sign in with the invited email and try again.")}finally{setBusy(false)}};
 return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>SOVEREIGN PROSURANCE · ORGANIZATION INVITATION</p><h1>Join an organization</h1><p>Accept this invitation using the account whose email address was invited. The invitation is time-limited and can only be used once.</p>{!token&&<p className={styles.error}>Invitation token is missing from this link.</p>}{error&&<p className={styles.error}>{error}</p>}{message&&<p className={styles.success}>{message}</p>}<Button disabled={!token||busy||!!message} onClick={accept}>{busy?"Accepting…":message?"Accepted":"Accept invitation"}</Button><Button variant="outline" onClick={()=>nav("/")}>Return to home</Button></section></main>;
}