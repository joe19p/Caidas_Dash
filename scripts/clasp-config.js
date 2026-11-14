// Lectura y validación de environments.json y de los archivos de proyecto de clasp (.clasp.json / .clasp.dev.json).
const fs = require('node:fs');
const path = require('node:path');

function readEnvironment(root, name, { deploy = false, newDeployment = false } = {}) {
  const environments = JSON.parse(fs.readFileSync(path.join(root, 'environments.json'), 'utf8'));
  const env = environments[name];
  if (!env || !['dev', 'prod'].includes(name)) throw new Error(`Entorno desconocido: ${name}.`);
  const file = path.resolve(root, env.project);
  if (!fs.existsSync(file)) throw new Error(`Falta ${env.project}. Copia ${env.project}.example (o .clasp.dev.json.example) y configura scriptId y rootDir.`);
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!/^[\w-]{20,}$/.test(project.scriptId || '') || /ID_DEL|TU_SCRIPT|REEMPLAZA/.test(project.scriptId)) {
    throw new Error(`scriptId inválido en ${env.project}.`);
  }
  if (path.resolve(root, project.rootDir || '.') !== path.join(root, 'dist')) throw new Error(`Configura rootDir como ./dist en ${env.project}.`);
  const other = environments[name === 'dev' ? 'prod' : 'dev'];
  if (other && fs.existsSync(path.resolve(root, other.project))) {
    const otherProject = JSON.parse(fs.readFileSync(path.resolve(root, other.project), 'utf8'));
    if (otherProject.scriptId === project.scriptId) throw new Error('Dev y producción no pueden apuntar al mismo scriptId.');
    if (env.deploymentId && env.deploymentId === other.deploymentId) throw new Error('Dev y producción no pueden compartir deploymentId.');
  }
  if (deploy && !env.deploymentId && !newDeployment) throw new Error(`Falta deploymentId de ${name} en environments.json. Configúralo antes de publicar o usa --new explícitamente.`);
  if (env.deploymentId && !/^[\w-]{20,}$/.test(env.deploymentId)) throw new Error(`deploymentId inválido para ${name}.`);
  return { ...env, projectConfig: project };
}

module.exports = { readEnvironment };
