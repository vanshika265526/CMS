import { Request, Response } from "express";
import {
  buildStudentContext,
  answerQuestion,
} from "../services/ai/assistantService.js";

const MAX_QUESTION_LENGTH = 1000;

export const askAssistant = async (req: Request, res: Response) => {
  try {
    const { question, history } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ success: false, message: "Please enter a question" });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please keep your question under ${MAX_QUESTION_LENGTH} characters`,
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
          .slice(-6)
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      : [];

    const context = await buildStudentContext((req as any).user);
    const result = await answerQuestion(context, question.trim(), safeHistory);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** The same grounded facts the assistant reasons over, for the context panel. */
export const getAssistantContext = async (req: Request, res: Response) => {
  try {
    const context = await buildStudentContext((req as any).user);
    res.status(200).json({
      success: true,
      data: {
        ...context,
        llmEnabled: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
