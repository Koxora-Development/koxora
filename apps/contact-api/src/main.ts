import { ConfigurationError, readConfig } from './config';
import { createMailer } from './mailer';
import { createContactServer } from './server';
/**
 * Starts the contact service, or refuses to.
 *
 * A missing setting is a startup failure with a message naming it, never a
 * service that answers and cannot deliver. The SMTP connection is verified
 * once at startup and the result is logged: a service that cannot reach its
 * mail server should say so in the logs on the first line, not on the first
 * reader's message.
 */
let config;
try {
  config = readConfig();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Contact service not started: ${error.message}`);
    process.exit(78); // EX_CONFIG
  }
  throw error;
}
const mailer = createMailer(config);
const server = createContactServer({
  config,
  mailer,
  // One line per submission, with no address, no subject and no message in
  // it. The outcome and the category are what operations needs to see.
  log: (entry) => console.log(JSON.stringify(entry)),
});
server.listen(config.port, config.host, () => {
  console.log(
    JSON.stringify({
      event: 'listening',
      host: config.host,
      port: config.port,
      recipient: config.recipient,
      origins: config.allowedOrigins,
    }),
  );
});
void mailer.verify().then((reachable) => {
  console.log(
    JSON.stringify({
      event: 'smtp-check',
      reachable,
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
    }),
  );
});
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    console.log(JSON.stringify({ event: 'stopping', signal }));
    server.close(() => {
      mailer.close();
      process.exit(0);
    });
  });
