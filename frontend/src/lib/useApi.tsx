import { useAuth } from "@/app/AuthProvider";

function isExpired(exp?:string) {
    if (!exp) { return true }
    const prevTime = (new Date(exp)).getTime();
    const now = Date.now();
    return (now - prevTime) > 30 * 1000
}

export function api() {
    const { access, setAccess, exp, setExp } = useAuth();

    return async (input: RequestInfo, init:RequestInit = {}) => {

        if (isExpired(exp)) {
            try {
                const res = await fetch(`${process.env.API_URL}/auth/refresh`, {
                    method: "GET",
                    credentials: "include",
                    headers:{
                        "Content-Type": "application/json",
                    },
                }).then(res => res.json())
                if (res.status == 200) {
                    setAccess(res.Access_Token.token)
                    setExp(res.Access_Token.exp)
                } else {
                    setAccess(res.Access_Token.token)
                    setExp(res.Access_Token.exp)
                    return null
                }
            } catch (err) {
                setAccess(undefined)
                setExp(undefined)
                return null
            }
        }

        return fetch(input,{
            ...init,
            headers: {
                ...init.headers,
                'Authorization': `Bearer ${access}`,
            }
        })
    }
}