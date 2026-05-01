'use client';

import { useState } from 'react';
import { LuX } from 'react-icons/lu';

import RightSide from '../utils/RightSide';

import { useAuth } from '@/app/AuthProvider';
import { useApi } from '@/lib/useApi';

export function SecuritySettings() {
  const [showDelete, setShowDelete] = useState(false);
  const backend = useApi();
  const { clearAuth } = useAuth();

  async function handleDeleteAccount() {
    const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/auth/delete_user`, {
      method: 'DELETE',
    });

    if (res.ok) {
      // Clear frontend auth state
      clearAuth();

      // Clear local and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear any accessible frontend cookies
      // document.cookie.split(';').forEach((c) => {
      //   document.cookie = c
      //     .replace(/^ +/, '')
      //     .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      // });

      window.location.href = '/';
    } else {
      console.error('Failed to delete account');
    }
  }

  return (
    <div id="security">
      <h2 className="text-xl font-medium text-palette-rich-teal mb-4">Security</h2>
      {/* <p>Here you can change your password and manage your account security.</p> */}

      <div className="pt-4 border-t border-red-200">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your data will be permanently
          removed.
        </p>
        <button
          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition cursor-pointer"
          onClick={() => setShowDelete(true)}
        >
          Delete Account
        </button>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="px-6 py-4 max-w-[96%] w-full sm:w-[28rem] bg-white rounded-xl shadow-2xl shadow-red-900/50 border border-red-500/20">
            <RightSide className="!mb-1 !mr-0">
              <LuX
                className="w-5 font-semibold text-red-950 h-auto cursor-pointer hover:text-red-700"
                onClick={() => setShowDelete(false)}
              />
            </RightSide>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Are you <b>100%</b> sure?
            </h2>
            <p className="text-sm mt-2 text-gray-800 leading-relaxed">
              You are about to <b>permanently delete</b> your account and <b>all associated data</b>
              . This action <b>cannot be undone</b>.
            </p>
            <RightSide className="mt-8 gap-3">
              <button
                className="px-4 py-1.5 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1.5 bg-red-700 hover:bg-red-800 font-medium text-white rounded cursor-pointer shadow-sm shadow-red-700/50 transition"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </RightSide>
          </div>
        </div>
      )}
    </div>
  );
}
