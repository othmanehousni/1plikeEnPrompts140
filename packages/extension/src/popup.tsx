import { useEffect, useState } from "react";
import "./style.css";

function IndexPopup() {
	const [token, setToken] = useState<string>("Token non disponible");
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		// Récupérer le token depuis le stockage local
		chrome.storage.local.get(["edAuthToken"], (result) => {
			if (result.edAuthToken) {
				setToken(result.edAuthToken);
			}
		});
	}, []);

	const copyToken = async () => {
		try {
			await navigator.clipboard.writeText(token);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Erreur de copie:", err);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				padding: 20,
				width: 320,
				background: "linear-gradient(135deg, #f5f5f5, #ffffff)",
				borderRadius: "10px",
				boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
				fontFamily: "system-ui, -apple-system, sans-serif",
			}}
		>
			<h2
				style={{
					margin: "0 0 16px 0",
					color: "#8a2be2",
					fontSize: "24px",
					fontWeight: "600",
					textAlign: "center",
					background: "linear-gradient(135deg, #8a2be2, #9370db)",
					WebkitBackgroundClip: "text",
					WebkitTextFillColor: "transparent",
				}}
			>
				ED Token
			</h2>

			<div
				style={{
					padding: "12px",
					border: "1px solid #e0e0e0",
					borderRadius: "8px",
					marginBottom: "20px",
					wordBreak: "break-all",
					background: "rgba(255, 255, 255, 0.8)",
					maxHeight: "120px",
					overflow: "auto",
					boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
					fontSize: "14px",
					color: "#333",
					fontFamily: "monospace",
				}}
			>
				{token}
			</div>

			<button
				type="button"
				onClick={copyToken}
				onFocus={(e) => {
					e.currentTarget.style.transform = "translateY(-2px)"
					e.currentTarget.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)"
				}}
				onBlur={(e) => {
					e.currentTarget.style.transform = "translateY(0)"
					e.currentTarget.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)"
				}}
				onMouseOver={(e) => {
					e.currentTarget.style.transform = "translateY(-2px)"
					e.currentTarget.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)"
				}}
				onMouseOut={(e) => {
					e.currentTarget.style.transform = "translateY(0)"
					e.currentTarget.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)"
				}}
				style={{
					padding: "10px 18px",
					background: copied
						? "linear-gradient(135deg, #4CAF50, #45a049)"
						: "linear-gradient(135deg, #8a2be2, #9370db)",
					color: "white",
					border: "none",
					borderRadius: "30px",
					cursor: "pointer",
					fontWeight: "600",
					fontSize: "15px",
					transition: "all 0.3s ease",
					boxShadow: "0 4px 8px rgba(138, 43, 226, 0.3)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{copied ? "Copié!" : "Copier le token"} {copied ? "✓" : "📋"}
			</button>

			<p
				style={{
					fontSize: "12px",
					color: "#666",
					marginTop: "20px",
					textAlign: "center",
					fontStyle: "italic",
				}}
			>
				Mettez ce token dans le champ "Token" de l'appli.
			</p>
		</div>
	);
}

export default IndexPopup;
