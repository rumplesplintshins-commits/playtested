import PasswordSettings from "../components/PasswordSettings";
export const metadata={title:"Password recovery | Playtested",robots:{index:false}};
export default function ForgotPassword(){return <main className="mx-auto min-h-screen max-w-lg px-5 py-12"><PasswordSettings mode="request"/></main>;}
