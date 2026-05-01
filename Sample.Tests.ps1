Describe "Sample Math Tests" {
    It "adds numbers correctly" {
        $sum = 2 + 2
        $sum | Should Be 4
    }
    It "multiplies numbers correctly" {
        $product = 3 * 3
        $product | Should Be 9
    }
}
