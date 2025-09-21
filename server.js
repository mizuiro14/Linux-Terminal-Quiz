const { GoogleGenAI } = require("@google/genai")
const express = require("express")
const app = express()
const path = require("path")

app.use(express.json())
app.use(express.static("public"))

const PORT = 3000
const ai = new GoogleGenAI({
  apiKey: "AIzaSyDoqkPAj2A7Wj1-n2qDaT-RjeDY5w4SY2Q"
})

let usedQuestions = []

app.post("/borbonSE", async (req, res) => {
    const avoidList = usedQuestions.join("\n")

    const prompt = `
    Create a Linux terminal command multiple-choice quiz question.
    Format the response as JSON with the following keys:
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": number,
      "info": {
        "A": "info about option A",
        "B": "info about option B",
        "C": "info about option C",
        "D": "info about option D"
      }
    }

    Rules:
    - Only ONE option is correct.
    - Include A., B., etc in the options
    - Do NOT repeat any of these previously used questions:
    ${avoidList}
    - Provide helpful tips, alternatives, and explanations.
    `

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "You are a Linux tutor. Always return strictly valid JSON.",
            thinkingConfig: { thinkingBudget: 0 },
        },
    })

    let text = response.text
    console.log("Gemini Response:", text)

    try {
        text = text.replace(/```json/g, "").replace(/```/g, "").trim()
        const data = JSON.parse(text)

        if (!usedQuestions.includes(data.question)) { //prevent repeating questions
            usedQuestions.push(data.question)
        }

        res.json(data)
    } catch (err) {
        console.error("Error parsing JSON:", err)
        res.status(500).json({ error: "Invalid response format from Gemini" })
    }
})



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})
