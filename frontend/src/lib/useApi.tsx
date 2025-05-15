import { useAuth } from "@/app/AuthProvider";

function isExpired(exp?:string) {
    if (!exp) { return true }
    const prevTime = (new Date(exp)).getTime();
    const now = Date.now();
    return (now - prevTime) > 30 * 1000
}

export function api() {
    const { access, setAccess, exp, setExp, setUsername } = useAuth();

    return async (input: RequestInfo, init:RequestInit = {}) => {
        let token = access;
        console.log(`expiration date: ${exp}`)
        if (isExpired(exp)) {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
                    method: "GET",
                    credentials: "include",
                    headers:{
                        "Content-Type": "application/json",
                    },
                })

                if (res.ok) {
                    const response = await res.json()
                    setAccess(response.Access_Token.token);
                    setExp(response.Access_Token.exp);
                    setUsername(response.username);
                    token = response.Access_Token.token;
                } else {
                    return res
                }
            } catch (err) {
                setAccess(undefined)
                setExp(undefined)
                console.log("error in frontend")
                return {"ok":false}
            }
        }
        
        return fetch(input,{
            ...init,
            credentials: "include",
            headers: {
                ...init.headers,
                'Authorization': `Bearer ${token}`,
            }
        })
    }
}
