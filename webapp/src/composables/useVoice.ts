

export async function useVoiceBrowser(content: string) {
    console.log("Using voice");
    const utterance = new SpeechSynthesisUtterance(content);
    await new Promise<void>((resolve, reject) => {
        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);
        window.speechSynthesis.speak(utterance);
    });
}