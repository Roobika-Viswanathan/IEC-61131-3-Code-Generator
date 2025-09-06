**🤖 AI-Powered IEC 61131-3 Code Generator – Model 2 (Backup)******

A Streamlit-based AI application that converts natural language control logic into IEC 61131-3 Structured Text (ST) code and flowcharts.
This is Model 2, a backup version of our main IEC Code Generator, hosted on Streamlit for reliability and continuous availability.

✨ Features

🔧 Generate PLC Code – Natural language → IEC 61131-3 Structured Text

📊 Generate Flowcharts – Mermaid diagrams representing control logic

⚡ Clarification Agent – Asks follow-up questions if input is unclear

✅ Code Validator – Ensures syntax, conventions, and best practices

🔧 Code Refiner – Adds safety interlocks, optimizes performance, and improves readability

💾 Download Support – Export generated PLC code as .st files

🖥️ Session Context – Maintains conversation history for consistent results

🛠️ Tech Stack

Streamlit
 – Web interface

Phi Agents
 – AI orchestration

Groq
 – LLM inference engine

DuckDuckGo API
 – Knowledge search

📂 Project Structure
├── app.py              # Main Streamlit app  
├── requirements.txt    # Python dependencies  
├── README.md           # Documentation  
└── .env                # API keys and environment variables  

⚙️ Installation

1️⃣ Clone the repository:

git clone https://github.com/Roobiii/ABB_Hackathon.git
cd ABB_Hackathon


2️⃣ Create and activate a virtual environment:

python -m venv venv
# macOS/Linux
source venv/bin/activate
# Windows
venv\Scripts\activate


3️⃣ Install dependencies:

pip install -r requirements.txt


4️⃣ Add your API keys to .env:

GROQ_API_KEY="your_groq_api_key_here"

▶️ Usage

Run the app:

streamlit run app.py


Open the provided localhost link in your browser.

📊 Example

Input (Natural Language):

Turn ON motor when temperature exceeds 50C and pressure is below 100 bar, turn OFF when temperature drops below 45C.

Generated IEC 61131-3 Structured Text:

VAR
    Temperature_Sensor : REAL;
    Pressure_Sensor : REAL;
    Motor_Start : BOOL;
END_VAR

IF Temperature_Sensor > 50.0 AND Pressure_Sensor < 100.0 THEN
    Motor_Start := TRUE;
ELSIF Temperature_Sensor < 45.0 THEN
    Motor_Start := FALSE;
END_IF;


Generated Flowchart (Mermaid):

flowchart TD
    A([Start]) --> B{Temperature > 50C AND Pressure < 100 bar?}
    B -- Yes --> C[Turn ON Motor]
    B -- No --> D{Temperature < 45C?}
    D -- Yes --> E[Turn OFF Motor]
    D -- No --> F[Keep Current State]
    C --> F
    E --> F
    F --> G([End])

🧑‍💻 Contributing

Contributions are welcome! Fork the repo and submit a PR.

📜 License

Licensed under the MIT License.
