import logging
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from .reasoning_agent import ReasoningAgent

logger = logging.getLogger(__name__)

# Define the state for the graph
class AgentState(TypedDict):
    text: str
    findings: List[Dict[str, Any]]
    status: str

class GraphOrchestrator:
    def __init__(self):
        self.reasoning_agent = ReasoningAgent()
        self.graph = self._build_graph()

    def _build_graph(self):
        # Initialize graph
        builder = StateGraph(AgentState)
        
        # Add nodes
        builder.add_node("reason", self._reasoning_node)
        
        # Set entry point
        builder.set_entry_point("reason")
        
        # Add edges (simple linear graph for now)
        builder.add_edge("reason", END)
        
        return builder.compile()

    def _reasoning_node(self, state: AgentState) -> Dict[str, Any]:
        """Node function to invoke the Reasoning Agent"""
        logger.info("Invoking LLM Reasoning Agent...")
        try:
            findings = self.reasoning_agent.invoke(state["text"])
            return {"findings": findings, "status": "COMPLETED"}
        except Exception as e:
            logger.error(f"Graph execution failed at reasoning_node: {str(e)}")
            # Implement Graceful Degradation / Circuit Breaking
            return {
                "findings": [{
                    "category": "AGENT_ERROR",
                    "confidence": 0.5,
                    "detector_source": "LANGGRAPH_ORCHESTRATOR",
                    "evidence": f"LLM Reasoning failed or timed out: {str(e)}"
                }],
                "status": "FAILED"
            }

    def analyze(self, text: str) -> List[Dict[str, Any]]:
        """Entry point for the backend routes to call the graph."""
        initial_state = {
            "text": text,
            "findings": [],
            "status": "INITIALIZED"
        }
        
        try:
            # We can pass recursion_limit or configure timeouts if needed
            final_state = self.graph.invoke(initial_state)
            return final_state.get("findings", [])
        except Exception as e:
            logger.error(f"Total graph failure: {e}")
            return []
