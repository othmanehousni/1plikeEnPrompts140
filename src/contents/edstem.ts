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
  copyButton.textContent = "Copier ED Token";
  copyButton.style.position = "fixed";
  copyButton.style.bottom = "20px";
  copyButton.style.right = "20px";
  copyButton.style.zIndex = "9999";
  copyButton.style.padding = "10px";
  copyButton.style.background = "#4285F4";
  copyButton.style.color = "white";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "4px";
  copyButton.style.cursor = "pointer";
  
  copyButton.addEventListener("click", () => {
    navigator.clipboard.writeText(authToken)
      .then(() => {
        copyButton.textContent = "Token Copié!";
        setTimeout(() => {
          copyButton.textContent = "Copier ED Token";
        }, 2000);
      })
      .catch(err => {
        console.error("[ED Extension] Erreur lors de la copie:", err);
        copyButton.textContent = "Erreur de copie";
      });
  });
  
  document.body.appendChild(copyButton);
} 