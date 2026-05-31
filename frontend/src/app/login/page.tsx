import { GoogleOAuthProvider } from '@react-oauth/google';
import Image from 'next/image';

import AuthForm from '@/components/Auth/AuthForm-Login';
import PublicNavbar from '@/components/PublicNavbar';

export default function Landing() {
  // TODO: if they are already logged in, then there is no need to get their credentials
  return (
    <section className="overflow-x-hidden flex justify-center items-center h-dvh w-dvw relative">
      <Image
        className="absolute object-cover object-center left-[-2px] right-[-2px] w-[calc(100vw+15rem)]  md:w-[calc(100vw+4px)] max-w-none"
        src="/backgroundLogin.svg"
        alt="background2"
        width={1437}
        height={496}
      />
      <PublicNavbar />
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_CLIENT_ID || ''}>
        <AuthForm />
      </GoogleOAuthProvider>
    </section>
  );
}
