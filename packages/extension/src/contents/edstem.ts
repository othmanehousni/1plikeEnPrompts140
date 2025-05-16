console.log("[ED Extension] Content script is running");

const authToken = localStorage.getItem("authToken");

console.log("[ED Extension] Auth token:", authToken);

if (authToken) {
  // Stocker dans sessionStorage
  sessionStorage.setItem("edAuthToken", authToken);
  
  // Stocker dans le stockage de l'extension (accessible par d'autres extensions)
  chrome.storage.local.set({ edAuthToken: authToken }, () => {
    console.log("[ED Extension] Token stocké dans chrome.storage.local");
  });
  
  // Créer un bouton flottant pour copier le token
  const copyButton = document.createElement("button");
  copyButton.textContent = "ED Token";
  copyButton.style.position = "fixed";
  copyButton.style.bottom = "20px";
  copyButton.style.right = "20px";
  copyButton.style.zIndex = "9999";
  copyButton.style.padding = "10px 15px";
  copyButton.style.background = "linear-gradient(135deg, #8a2be2, #9370db)";
  copyButton.style.color = "white";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "30px";
  copyButton.style.cursor = "pointer";
  copyButton.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)";
  copyButton.style.fontWeight = "bold";
  copyButton.style.fontSize = "14px";
  copyButton.style.transition = "all 0.3s ease";
  
  // Add icon using emoji
  const iconSpan = document.createElement("span");
  iconSpan.textContent = " 📋";
  iconSpan.style.marginLeft = "5px";
  copyButton.appendChild(iconSpan);
  
  copyButton.addEventListener("mouseover", () => {
    copyButton.style.transform = "translateY(-2px)";
    copyButton.style.boxShadow = "0 6px 12px rgba(138, 43, 226, 0.4)";
  });
  
  copyButton.addEventListener("mouseout", () => {
    copyButton.style.transform = "translateY(0)";
    copyButton.style.boxShadow = "0 4px 8px rgba(138, 43, 226, 0.3)";
  });
  
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(authToken)
      .then(() => {
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "ED Token";
          // Re-add the icon
          const iconSpan = document.createElement("span");
          iconSpan.textContent = " 📋";
          iconSpan.style.marginLeft = "5px";
          copyButton.appendChild(iconSpan);
        }, 2000);
      })
      .catch(err => {
        console.error("[ED Extension] Erreur lors de la copie:", err);
        copyButton.textContent = "Error";
      });
  });
  
  document.body.appendChild(copyButton);
} 