
const Input = (props: any) => (
    <input
        {...props}
        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
    />
);

export function SecuritySettings() {
    return (
        <div>
            <h2 className="text-2xl font-bold text-palette-rich-teal mb-4">
                Security
            </h2>
            <p>
                Here you can change your password and manage your account
                security.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                Old Password
            </div>
            <Input id="oldPassword" type="oldPassword" placeholder="********" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                New Password
            </div>
        </div>
    );
}
