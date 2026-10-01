import { AIProviderId } from "../../types";
import { BackendProvider } from "./BackendProvider";
import { ILLMProvider } from "./ILLMProvider";

export class LLMFactory {
  /**
   * Devuelve el proveedor LLM del cliente.
   *
   * Siempre es BackendProvider: el navegador no habla con Google directamente.
   * El segundo parámetro se conserva por compatibilidad, pero se ignora: la
   * API key vive en el servidor y no debe circular por el cliente.
   */
  static getProvider(_providerId: AIProviderId, _apiKey?: string): ILLMProvider {
    return new BackendProvider();
  }
}
