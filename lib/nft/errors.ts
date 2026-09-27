/**
 * Custom error classes for the NFT metadata pipeline.
 */

import type { ValidationFieldError } from "./types"

/**
 * Thrown when a `NftMetadata` object fails SEP-0039 schema validation.
 * The `errors` array contains field-level details.
 */
export class MetadataValidationError extends Error {
  readonly errors: ValidationFieldError[]

  constructor(errors: ValidationFieldError[]) {
    const summary = errors.map((e) => `${e.field}: ${e.message}`).join("; ")
    super(`NFT metadata validation failed — ${summary}`)
    this.name = "MetadataValidationError"
    this.errors = errors
  }
}

/**
 * Thrown when the IPFS proxy returns a non-2xx response during metadata upload.
 */
export class IpfsUploadError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(`IPFS metadata upload failed with HTTP ${status}: ${body}`)
    this.name = "IpfsUploadError"
    this.status = status
    this.body = body
  }
}
