import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { generatePrompt } from "./prompt";
import dotenv from "dotenv";

// Cargar las variables de entorno
dotenv.config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 
 * @param name 
 * @param history 
 */
const run = async (name: string, history: ChatCompletionMessageParam[]): Promise<string> => {

    const promtp = generatePrompt(name)
   
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                "role": "system",
                "content": promtp
            },
            ...history
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 0,
        frequency_penalty: 0,
        presence_penalty: 0,
    });
    console.log(response.choices);
    
    return response.choices[0].message.content
}



export { run }


