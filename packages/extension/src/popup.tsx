import { useEffect, useState } from "react";
import "./style.css";

function IndexPopup() {
	const [token, setToken] = useState<string>("The token is not available. Please visit edstem.org to get your token.");
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [showToken, setShowToken] = useState<boolean>(false);
	const [isTokenAvailable, setIsTokenAvailable] = useState<boolean>(false);

	useEffect(() => {
		// Fetch token from local storage
		chrome.storage.local.get(["edAuthToken"], (result) => {
			if (result.edAuthToken) {
				setToken(result.edAuthToken);
				setIsTokenAvailable(true);
			}
		});
	}, []);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(token);
			setIsCopied(true);
			setTimeout(() => {
				setIsCopied(false);
			}, 2000);
		} catch (error) {
			console.error("Failed to copy:", error);
		}
	};

	const toggleTokenVisibility = () => {
		setShowToken(!showToken);
	};

	const maskToken = (tok: string) => {
		if (!isTokenAvailable) {
			return tok;
		}
		// Use the exact same number of characters as the token
		return '•'.repeat(tok.length);
	};

	const handleButtonClick = () => {
		if (isTokenAvailable) {
			// Redirect to Ask-ED
			window.open("http://localhost:3000/", "_blank");
		} else {
			// Redirect to ED Stem dashboard
			window.open("https://edstem.org/eu/dashboard", "_blank");
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
				Ask ED - Token Retrieval
			</h2>

			<div
				style={{
					position: "relative",
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
				{showToken ? token : maskToken(token)}
				{isTokenAvailable && (
					<button
						type="button"
						onClick={toggleTokenVisibility}
						style={{
							position: "absolute",
							top: "100px",
							right: "6px",
							background: "transparent",
							border: "none",
							cursor: "pointer",
							padding: "4px",
							borderRadius: "4px",
							color: "#8a2be2",
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{showToken ? (
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
						) : (
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						)}
					</button>
				)}
			</div>

			<div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
				<button
					type="button"
					onClick={isTokenAvailable ? copyToClipboard : handleButtonClick}
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
						flex: "1",
						padding: "10px 18px",
						background: isCopied 
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
					{isTokenAvailable 
						? (isCopied ? "Copied! ✓" : "Copy your token 📋") 
						: "Obtain your token by visiting ED Stem 🔑"}
				</button>
			</div>
			
			{isTokenAvailable && (
				<button
					type="button"
					onClick={handleButtonClick}
					onFocus={(e) => {
						e.currentTarget.style.transform = "translateY(-2px)"
						e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 150, 255, 0.4)"
					}}
					onBlur={(e) => {
						e.currentTarget.style.transform = "translateY(0)"
						e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 150, 255, 0.3)"
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.transform = "translateY(-2px)"
						e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 150, 255, 0.4)"
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.transform = "translateY(0)"
						e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 150, 255, 0.3)"
					}}
					style={{
						padding: "10px 18px",
						background: "linear-gradient(135deg, #0096FF, #5271FF)",
						color: "white",
						border: "none",
						borderRadius: "30px",
						cursor: "pointer",
						fontWeight: "600",
						fontSize: "15px",
						transition: "all 0.3s ease",
						boxShadow: "0 4px 8px rgba(0, 150, 255, 0.3)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						marginBottom: "12px"
					}}
				>
					Go to Ask-ED 🚀
				</button>
			)}

			<p
				style={{
					fontSize: "12px",
					color: "#666",
					marginTop: "20px",
					textAlign: "center",
					fontStyle: "italic",
				}}
			>
				{isTokenAvailable 
					? "Go to Ask-ED, your token should be automatically inserted." 
					: "Connect to ED Stem to get your access token."}
			</p>
		</div>
	);
}

export default IndexPopup;
