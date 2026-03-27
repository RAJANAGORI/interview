# Critical Clarification Secure CI CD Pipeline Security Misconceptions

- "We scan code, so pipeline is secure."  
  Pipeline identity, runner trust, and artifact provenance are separate controls.

- "Self-hosted runners are always safer."  
  They can increase blast radius if isolation, patching, and network segmentation are weak.

- "One broken gate justifies permanent bypass."  
  Bypass must be temporary, approved, and tracked with remediation SLA.
