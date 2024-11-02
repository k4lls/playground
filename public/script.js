// Function to handle sending the message
function sendMessage() {
  const question = document.getElementById("message").value;
  if (!question) return;

  // Add user message to chat box
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<p><strong>You:</strong> ${question}</p>`;

  // Show the spinner when the message is sent
  const spinner = document.getElementById("spinner");
  spinner.style.display = "block"; // Show the spinner

  // Establish WebSocket connection
  const ws = new WebSocket("ws://localhost:3001");

  ws.onopen = function () {
    ws.send(JSON.stringify({ question }));
  };

  let fullResponse = "**Perrier Assist:** "; // To accumulate all data chunks
  let partialResponse = ""; // To accumulate chunks and display progressively
  let responseSpan = document.createElement("div"); // A container for assistant response
  chatBox.appendChild(responseSpan);

  // Progressively update the display every second
  const renderInterval = setInterval(() => {
    if (partialResponse) {
      responseSpan.innerHTML = marked(partialResponse); // Render progressively
    }
  }, 1000); // Every second

  ws.onmessage = function (event) {
    const data = JSON.parse(event.data);

    // Hide the spinner as soon as the first message is received
    spinner.style.display = "none"; // Hide the spinner

    if (data.content !== "[END]") {
      // Accumulate chunks for final render
      fullResponse += data.content;
      // Also accumulate partial response to display progressively
      partialResponse += data.content;
    } else {
      // On receiving [END], clear the interval and do a final full render
      clearInterval(renderInterval);
      responseSpan.innerHTML = marked(fullResponse); // Render final response with full data
      ws.close(); // Close WebSocket
    }

    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
  };

  ws.onerror = function (error) {
    console.error("WebSocket Error:", error);
    chatBox.innerHTML += `<p style="color: red;">Error: WebSocket connection failed.</p>`;
    spinner.style.display = "none"; // Hide the spinner in case of an error
  };

  document.getElementById("message").value = ""; // Clear the input field
}

// Add an event listener to the Send button
document.getElementById("send-btn").addEventListener("click", sendMessage);

// Add an event listener to detect the "Enter" key
document.getElementById("message").addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent default behavior (like a newline)
    sendMessage(); // Call sendMessage function
  }
});
