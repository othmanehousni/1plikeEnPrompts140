import { useEffect, useState } from "react"

function IndexPopup() {
  const [token, setToken] = useState<string>("Token non disponible")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Récupérer le token depuis le stockage local
    chrome.storage.local.get(["edAuthToken"], (result) => {
      if (result.edAuthToken) {
        setToken(result.edAuthToken)
      }
    })
  }, [])

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erreur de copie:", err)
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 300
      }}>
      <h2>ED Token</h2>
      
      <div style={{ 
        padding: "8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        marginBottom: "16px",
        wordBreak: "break-all",
        background: "#f5f5f5",
        maxHeight: "100px",
        overflow: "auto"
      }}>
        {token}
      </div>
      
      <button
        onClick={copyToken}
        style={{
          padding: "8px 16px",
          background: copied ? "#4CAF50" : "#4285F4",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
        {copied ? "Copié!" : "Copier le token"}
      </button>
      
      <p style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
        Ce token peut être utilisé pour accéder à l'API ED.
      </p>
    </div>
  )
}

export default IndexPopup 