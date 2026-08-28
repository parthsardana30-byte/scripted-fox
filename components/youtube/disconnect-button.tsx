"use client";

import { disconnectYouTubeAction } from "@/app/connect/actions";

export function DisconnectYouTubeButton() {
  return <form
    action={disconnectYouTubeAction}
    onSubmit={(event) => {
      if (!window.confirm("Disconnect YouTube and remove the stored authorization?")) event.preventDefault();
    }}
  >
    <button className="button button--secondary" type="submit">Disconnect YouTube</button>
  </form>;
}
