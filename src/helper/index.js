module.exports = {
    generateStoryPrompt: (chatHistory, latestUserPrompt) => {
        // Convert chat history into readable dialogue format
        const formattedHistory = chatHistory.map(entry => {
            return `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`;
        }).join("\n\n");


        // Construct the final prompt
        return `Below is a conversation history where the user and the AI have been collaborating on a novel. 
                The AI has generated chapter content based on user prompts, and the user has provided feedback or additional instructions. 
                Use the conversation history to understand the context, style, and tone of the novel so far.
                Continue the novel while maintaining consistency in plot, character development, and writing style. 
                If the user has provided specific instructions, incorporate them seamlessly. 
                If no explicit instructions are given, continue the novel naturally while ensuring a smooth transition from the last response.

                **Conversation History:**
                ${formattedHistory}

                **Latest User Input:**
                ${latestUserPrompt}

                **Continue the novel:**`;
    }
};
