import { Step, StepType } from "./types";

export function parseXml(response: string): Step[] {
  // Extract the XML content between <boltArtifact> tags
  const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);

  if (!xmlMatch) {
    return [];
  }

  const xmlContent = xmlMatch[1];
  const steps: Step[] = [];
  let stepId = 1;

  // Extract artifact title
  const titleMatch = response.match(/title="([^"]*)"/);
  const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';

  // Add initial artifact step
  steps.push({
    id: stepId++,
    title: artifactTitle,
    description: '',
    type: StepType.CreateFolder,
    status: 'pending',
  });

  // Regular expression to find boltAction elements
  const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;

  let match;
  while ((match = actionRegex.exec(xmlContent)) !== null) {
    const [, type, filePath, content] = match;

    // Remove triple backticks from content
    const cleanedContent = content
    .replace(/```(jsx|tsx|css)?/g, '') // Removes ```jsx or ```tsx
    .replace(/```/g, '') // Removes standalone ```
    .trim();

    if (type === 'file') {
      steps.push({
        id: stepId++,
        title: `Create ${filePath || 'file'}`,
        description: '',
        type: StepType.CreateFile,
        status: 'pending',
        code: cleanedContent,
        path: filePath,
      });
    } else if (type === 'shell') {
      steps.push({
        id: stepId++,
        title: 'Run command',
        description: '',
        type: StepType.RunScript,
        status: 'pending',
        code: cleanedContent,
      });
    }
  }

  return steps;
}
