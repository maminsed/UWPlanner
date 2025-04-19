import AuthForm from "@/components/AuthForm";
import Navbar from "@/components/Navabar";

export default function Landing() {
  return (
    <section className="overflow-x-hidden flex justify-center items-center h-dvh w-dvw">
        <Navbar />
        <AuthForm mode="Sign In"/>
    </section>
  );
}