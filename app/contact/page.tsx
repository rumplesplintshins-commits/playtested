import SiteInformation from "../components/SiteInformation";
import {publicMetadata} from "../../lib/seo";
export const metadata=publicMetadata("Contact/Support | Playtested","Contact Playtested for account, playtesting and community support.","/contact");
export default function Contact(){return <SiteInformation kind="contact"/>;}
