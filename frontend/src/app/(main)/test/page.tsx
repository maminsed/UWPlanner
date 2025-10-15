"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/AuthProvider";
import { api } from "@/lib/useApi";

export default function Test() {
    const [message, setMessage] = useState<string>();
    const { username } = useAuth();
    const backend = api();
    const router = useRouter();

    useEffect(() => {
        console.log("username: " + username);
        async function initial_handle() {
            try {
                const res = await backend(
                    `${process.env.NEXT_PUBLIC_API_URL}/test/`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            error: "False",
                        }),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                const response = await (res as Response).json().catch(() => {});
                if (!res?.ok) {
                    if (response.action == "logout") {
                        router.push("/");
                    } else if (response.action == "verify_code") {
                        router.push("/verify");
                    } else {
                        throw new Error("Error in Backend");
                    }
                }
                setMessage(response.message);
            } catch (err) {
                console.log(err);
                setMessage("Error in Response");
            }
        }

        initial_handle();
    }, []);

    return (
        <>
            <div className="text-black text-xl mt-30">
                {message} + cats + {username}
            </div>
            <p className="w-2">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Numquam, ullam provident. Voluptates voluptas, nostrum asperiores nisi odio rerum, sed perferendis ipsum maxime at repellendus possimus consequatur sint quasi molestias eum.
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Tempora expedita aliquam inventore quam voluptate. Cum neque optio delectus voluptates eveniet iusto explicabo magnam vitae, excepturi sequi, et ad, nisi nobis.
            </p>
        </>
    );
}
