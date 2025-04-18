// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {FundMe} from "../../src/FundMe.sol";
import {DeployFundMe} from "../../script/DeployFundMe.s.sol";

contract FundMeTest is Test {
    FundMe fundMe;

    address USER = makeAddr("user");
    uint256 constant SEND_VALUE = 0.1 ether;
    uint256 constant STARTING_BALANCE = 10 ether;
    uint256 constant GAS_PRICE = 1 ;

    function setUp() external {
        //fundMe = new FundMe(0x694A1769357215DE4FAC081bf1f309aDC325306);
        DeployFundMe deployFundMe = new DeployFundMe();
        fundMe = deployFundMe.run();
        vm.deal(USER, STARTING_BALANCE);
    }

    function testMinimumDollarIsFive() public view {
        assertEq(fundMe.MINIMUM_USD(), 5e18);
    }

    function testOwnerIsMsgSender() public view {
        //assertEq(fundMe.i_owner(), address(this));
        assertEq(fundMe.getOwner(), msg.sender);
    }

    function testPriceFeedVersionIsAccurate() public view {
        uint256 version = fundMe.getVersion();
        assertEq(version, 4);
    }

    function testFundFailsWithoutEnoughETH() public {
        vm.expectRevert(); // reverts the transaction if the condition is not met
        //uint256 cat = 1;  Fails because of the require statement in the fund function
        fundMe.fund(); // Test cases passed as the require statement is not met
    }

    function testFundUpdatesFundedDataStructure() public {
        vm.prank(USER); //The next TX will be sent by USER
        fundMe.fund{value: SEND_VALUE}();

        uint256 amountFunded = fundMe.getAddressToAmountFunded(USER);
        assertEq(amountFunded, SEND_VALUE);
    }

    function testAddsFunderToArrayOfFunders() public {
        vm.prank(USER);
        fundMe.fund{value: SEND_VALUE}();

        address funder = fundMe.getFunder(0);
        assertEq(funder, USER);
    }
    
    modifier funded() {
        vm.prank(USER);
        fundMe.fund{value: SEND_VALUE}();
        _;
    }

    function testOnlyOwnerCanWithdraw() public funded{
      
        vm.prank(USER);
        vm.expectRevert();
        fundMe.withdraw();
    }

    function testWithdrawWithSingleFunder() public funded {

        //Arrange
        uint256 startingOwnerBalance = fundMe.getOwner().balance;
        uint256 startingFundMeBalance = address(fundMe).balance;

        //Act 
        // uint256 gasStart = gasleft(); // 100
        //  vm.txGasPrice(GAS_PRICE);
        vm.prank(fundMe.getOwner()); // c: 200
        fundMe.withdraw();

        // uint256 gasEnd = gasleft(); // 800
        // uint256 gasUsed = (gasStart - gasEnd) * tx.gasprice;
        // //tx.gasprice tells the current gas price of the transaction
        // console.log("Gas used", gasUsed);

        //Assert
        uint256 endingOwnerBalance = fundMe.getOwner().balance;
        uint256 endingFundMeBalance = address(fundMe).balance;
        assertEq(endingFundMeBalance, 0);
        assertEq(startingFundMeBalance + startingOwnerBalance, endingOwnerBalance);

    }

    function testWithdrawFromMultipleFunders() public funded{
        //Arrange
        uint160 numberOfFunders = 10;
        uint160 startingFunderIndex = 1;
        for (uint160 i = startingFunderIndex; i < numberOfFunders; i++) {
            hoax(address(i), SEND_VALUE);
            fundMe.fund{value: SEND_VALUE}();
        }

        uint256 startingOwnerBalance = fundMe.getOwner().balance;
        uint256 startingFundMeBalance = address(fundMe).balance;
        
        //Act
        vm.startPrank(fundMe.getOwner());
        fundMe.withdraw();
        vm.stopPrank();

        //Assert
        assert(address(fundMe).balance == 0);
        assert(
            startingFundMeBalance + startingOwnerBalance == 
                fundMe.getOwner().balance
        );

        

    }

    function testWithdrawWithSingleFunderCheaper() public funded {

        //Arrange
        uint256 startingOwnerBalance = fundMe.getOwner().balance;
        uint256 startingFundMeBalance = address(fundMe).balance;

        //Act 
        // uint256 gasStart = gasleft(); // 100
        //  vm.txGasPrice(GAS_PRICE);
        vm.prank(fundMe.getOwner()); // c: 200
        fundMe.cheaperWithdraw();

        // uint256 gasEnd = gasleft(); // 800
        // uint256 gasUsed = (gasStart - gasEnd) * tx.gasprice;
        // //tx.gasprice tells the current gas price of the transaction
        // console.log("Gas used", gasUsed);

        //Assert
        uint256 endingOwnerBalance = fundMe.getOwner().balance;
        uint256 endingFundMeBalance = address(fundMe).balance;
        assertEq(endingFundMeBalance, 0);
        assertEq(startingFundMeBalance + startingOwnerBalance, endingOwnerBalance);

    }
    
}
