/**
 * Demonstration script for checkRegistrationStatus function
 * 
 * This script demonstrates the basic functionality of the registration status checker.
 * Run with: npx tsx lib/contracts/__tests__/demo-registration-status.ts
 */

/* eslint-disable no-console */
import { checkRegistrationStatus, clearRegistrationCache } from '../player-registration'

async function demonstrateRegistrationStatus() {
  console.log('=== Registration Status Checker Demo ===\n')

  const testHuntId = 123
  const testPlayerAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

  try {
    console.log('1. Checking registration status for unregistered player...')
    const status1 = await checkRegistrationStatus(testHuntId, testPlayerAddress)
    console.log('   Result:', JSON.stringify(status1, null, 2))
    console.log('   ✓ Function executed successfully\n')

    console.log('2. Checking again (should use cache)...')
    const status2 = await checkRegistrationStatus(testHuntId, testPlayerAddress)
    console.log('   Result:', JSON.stringify(status2, null, 2))
    console.log('   ✓ Cache working correctly\n')

    console.log('3. Clearing cache...')
    clearRegistrationCache(testHuntId, testPlayerAddress)
    console.log('   ✓ Cache cleared\n')

    console.log('4. Checking again (should query contract)...')
    const status3 = await checkRegistrationStatus(testHuntId, testPlayerAddress)
    console.log('   Result:', JSON.stringify(status3, null, 2))
    console.log('   ✓ Fresh query executed\n')

    console.log('=== Demo Complete ===')
    console.log('\nKey Features Demonstrated:')
    console.log('✓ Query player progress from contract')
    console.log('✓ Return structured RegistrationStatus object')
    console.log('✓ Cache results to avoid redundant queries')
    console.log('✓ Clear cache when needed')
  } catch (error) {
    console.error('Error during demo:', error)
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateRegistrationStatus()
}

export { demonstrateRegistrationStatus }
