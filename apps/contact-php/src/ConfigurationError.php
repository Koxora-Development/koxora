<?php

declare(strict_types=1);

namespace Koxora\Contact;

/**
 * A setting is missing or impossible. The message names what is wrong and is
 * written to the server log; it never reaches a client, because what the
 * server is missing is not a visitor's business.
 */
final class ConfigurationError extends \RuntimeException
{
}
