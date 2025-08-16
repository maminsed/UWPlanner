import { useAuth } from "@/app/AuthProvider";

export function isExpired(exp?:string) {
    if (!exp) { return true }
    const prevTime = (new Date(exp)).getTime();
    const now = Date.now();
    return (now - prevTime) > 30 * 1000
}

export function api() {
    const { access, setAccess, exp, setExp, setUsername, clearAuth } = useAuth();

    return async (input: RequestInfo, init:RequestInit = {}, check_protection:boolean = true) => {
        let token = access;
        if (check_protection) {
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
                        clearAuth();
                        return res
                    }
                } catch (err) {
                    clearAuth();
                    console.log("error in frontend")
                    return {"ok":false}
                }
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
