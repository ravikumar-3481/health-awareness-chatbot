from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from llm.llm import LLM
from llm.prompts import Prompts
from core.chunking import Chunking
from utils.logger import Logger

class Models:

    def __init__(self):
        self.llm = LLM()
        self.prompts = Prompts()
        self.chunking = Chunking()
        self.logger = Logger()
        self.log = self.logger.get_logger()



    def _build_chain(self, system_prompt: str):
        llm = self.llm.get_llm()
        prompt_template = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("human", "{text}")]
        )
        return (
            {"text": RunnablePassthrough()}
            | prompt_template
            | llm
            | StrOutputParser()
        )

    def preprocess_text(self, raw_text : str) -> str:
        if not raw_text:
            self.log.warning("Not Text Found For Preprocessing !!")
            return ""

        try:
            chain = self._build_chain(self.prompts.preprocess_text())
            chunks_context = self.chunking.chunking(raw_text)
            if not chunks_context:
                raise ValueError("No chunks to process")

            chunks = []
            for chunk in chunks_context:
                clean_text = chain.invoke({"text": chunk})
                chunks.append(clean_text)

            combined_text = "\n\n".join(chunks)
            return combined_text

        except (ModuleNotFoundError, RuntimeError, TypeError, ValueError) as e:
            self.log.error("Failed to Process text !!")
            raise RuntimeError(f"Failed to Process Text: {e}") from e


    def transform_text(self, raw_text : str) -> str:
        if not raw_text:
            self.log.warning("Not Text Found For Transformation !!")
            return ""

        text = self.preprocess_text(raw_text)

        try:
            chain = self._build_chain(self.prompts.transform_text())
            chunks_context = self.chunking.chunking(text)
            if not chunks_context:
                raise ValueError("No chunks to Transform")

            chunks = []
            for chunk in chunks_context:
                clean_text = chain.invoke({"text": chunk})
                chunks.append(clean_text)

            combined_text = "\n\n".join(chunks)
            return combined_text

        except (ModuleNotFoundError, RuntimeError, TypeError, ValueError) as e:
            self.log.error("Failed to Transform text !!")
            raise RuntimeError(f"Failed to Transform Text: {e}") from e

    def generate_answer(self, context: str, question: str) -> str:
        if not context or not question:
            self.log.warning("Missing context or question for answer generation")
            return ""

        try:
            llm = self.llm.get_llm(temperature=0.1)
            prompt_template = ChatPromptTemplate.from_template(self.prompts.health_assist())
            chain = prompt_template | llm | StrOutputParser()

            response = chain.invoke({"context": context, "question": question})
            return response.strip()

        except Exception as e:
            self.log.error(f"Failed to generate answer: {e}")
            raise RuntimeError(f"Failed to Generate Answer: {e}") from e