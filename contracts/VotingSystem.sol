// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VotingSystem {
    struct Admin {
        string username;
        bytes32 hashedPassword;
        address adminAddress;
    }

    struct Candidate {
        string name;
        uint voteCount;
    }

    struct Position {
        string name;
        Candidate[] candidates;
    }

    struct Ballot {
        string id; // Store the actual ballot ID (8-character string)
        string title;
        address adminAddress;
        Position[] positions;
        bool isClosed;
    }

    struct Voter {
        bytes32 hashedPassword;
        string ballotId; // Store unhashed ballot ID
        bool isRegistered;
        bool hasVoted;
    }

    mapping(address => Admin) private admins;
    mapping(string => address) private usernameToAddress;
    mapping(address => bool) public isAdminRegistered;
    mapping(string => Ballot) public ballots; // Use string as key to store actual Ballot ID
    mapping(address => string[]) private adminBallots; // Store actual ballot IDs
    mapping(address => Voter) public registeredVoters;

    event AdminRegistered(string username, address adminAddress);
    event BallotCreated(string ballotId, string title, address indexed admin);
    event VoterRegistered(address indexed voter, string ballotId);
    event VoterAuthenticated(address indexed voter);
    event VoteCasted(address indexed voter, string ballotId, uint positionIndex, uint candidateIndex);

    function registerAdmin(string memory _username, string memory _password) public {
        require(bytes(_username).length > 0, "Username required");
        require(bytes(_password).length > 0, "Password required");
        require(usernameToAddress[_username] == address(0), "Username already exists");
        require(!isAdminRegistered[msg.sender], "Admin already registered");

        bytes32 hashedPassword = keccak256(abi.encodePacked(_password));

        admins[msg.sender] = Admin(_username, hashedPassword, msg.sender);
        usernameToAddress[_username] = msg.sender;
        isAdminRegistered[msg.sender] = true;

        emit AdminRegistered(_username, msg.sender);
    }

    function adminLogin(string memory _username, string memory _password) 
    public view returns (bool, string[] memory, string[] memory) 
{
    address adminAddr = usernameToAddress[_username];
    require(adminAddr != address(0), "Admin not found");
    require(adminAddr == msg.sender, "Unauthorized: Use your registered MetaMask address");

    Admin storage admin = admins[adminAddr];
    require(admin.hashedPassword == keccak256(abi.encodePacked(_password)), "Incorrect password");

    uint ballotCountForAdmin = adminBallots[adminAddr].length;
    string[] memory ballotIds = new string[](ballotCountForAdmin);
    string[] memory ballotTitles = new string[](ballotCountForAdmin);

    for (uint i = 0; i < ballotCountForAdmin; i++) {
        string memory ballotId = adminBallots[adminAddr][i];
        ballotIds[i] = ballots[ballotId].id;
        ballotTitles[i] = ballots[ballotId].title;
    }

    return (true, ballotIds, ballotTitles);
}


    function createBallot(
        string memory _ballotId,
        string memory _title,
        string[] memory _positionNames,
        string[][] memory _candidateNames
    ) public {
        require(bytes(_ballotId).length == 8, "Ballot ID must be exactly 8 characters long");
        require(bytes(_title).length > 0, "Ballot title required");
        require(_positionNames.length > 0, "At least one position required");
        require(bytes(ballots[_ballotId].id).length == 0, "Ballot ID already exists");

        Ballot storage newBallot = ballots[_ballotId];
        newBallot.id = _ballotId;
        newBallot.title = _title;
        newBallot.adminAddress = msg.sender;
        newBallot.isClosed = false;

        for (uint i = 0; i < _positionNames.length; i++) {
            newBallot.positions.push();
            Position storage newPosition = newBallot.positions[i];
            newPosition.name = _positionNames[i];

            for (uint j = 0; j < _candidateNames[i].length; j++) {
                newPosition.candidates.push(Candidate(_candidateNames[i][j], 0));
            }
        }

        adminBallots[msg.sender].push(_ballotId);

        emit BallotCreated(_ballotId, _title, msg.sender);
    }

    function registerVoter(address _voter, string memory _ballotId, bytes32 _hashedPassword) public {
    require(isAdminRegistered[msg.sender], "Only admins can register voters");
    require(bytes(_ballotId).length == 8, "Invalid Ballot ID");
    require(!registeredVoters[_voter].isRegistered, "Voter already registered");
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");

    registeredVoters[_voter] = Voter(_hashedPassword, _ballotId, true, false);
    ballotVoters[_ballotId].push(_voter); // 🔹 Store voter address in array

    emit VoterRegistered(_voter, _ballotId);
}


    function authenticateVoter(string memory _ballotId, string memory _password) 
    public view returns (bool isAuthenticated, bool hasVoted, string memory ballotId) 
{
    require(bytes(_ballotId).length == 8, "Invalid Ballot ID");
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");

    Voter storage voter = registeredVoters[msg.sender];
    require(voter.isRegistered, "Voter not registered for any ballot");
    require(keccak256(abi.encodePacked(voter.ballotId)) == keccak256(abi.encodePacked(_ballotId)), "Ballot ID mismatch");
    require(voter.hashedPassword == keccak256(abi.encodePacked(_password)), "Incorrect password");

    return (true, voter.hasVoted, voter.ballotId); // ✅ Returns authentication status, hasVoted status, and ballot ID
}


    mapping(bytes32 => bool) private positionVotes; // Tracks if a voter has voted for each position

function voteMultiple(string memory _ballotId, uint[] memory _positionIndexes, uint[] memory _candidateIndexes) public {
    require(bytes(ballots[_ballotId].id).length > 0, "Invalid ballot ID");
    require(!ballots[_ballotId].isClosed, "Voting has ended");

    Voter storage voter = registeredVoters[msg.sender];
    require(voter.isRegistered, "Voter not registered");
    require(keccak256(abi.encodePacked(voter.ballotId)) == keccak256(abi.encodePacked(_ballotId)), "Ballot ID mismatch");
    require(!voter.hasVoted, "You have already completed voting");

    require(_positionIndexes.length == _candidateIndexes.length, "Invalid vote data");

    for (uint i = 0; i < _positionIndexes.length; i++) {
        uint positionIndex = _positionIndexes[i];
        uint candidateIndex = _candidateIndexes[i];

        // Ensure the voter has not voted for this position
        bytes32 voteKey = keccak256(abi.encodePacked(msg.sender, _ballotId, positionIndex));
        require(!positionVotes[voteKey], "Already voted for this position");

        // ✅ Register the vote
        ballots[_ballotId].positions[positionIndex].candidates[candidateIndex].voteCount++;
        positionVotes[voteKey] = true;
    }

    // ✅ Mark voter as "hasVoted" after completing all positions
    voter.hasVoted = true;

    emit VoteCasted(msg.sender, _ballotId, _positionIndexes[0], _candidateIndexes[0]); // Emit event for tracking
}




    function getMyBallots() public view returns (string[] memory, string[] memory) {
        uint ballotCountForAdmin = adminBallots[msg.sender].length;
        string[] memory ballotIds = new string[](ballotCountForAdmin);
        string[] memory ballotTitles = new string[](ballotCountForAdmin);

        for (uint i = 0; i < ballotCountForAdmin; i++) {
            string memory ballotId = adminBallots[msg.sender][i];
            ballotIds[i] = ballots[ballotId].id;
            ballotTitles[i] = ballots[ballotId].title;
        }

        return (ballotIds, ballotTitles);
    }

    // Function to get ballot details
    function getBallotDetails(string memory _ballotId)
        public
        view
        returns (string memory, string memory, string[] memory, string[][] memory)
    {
        require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");

        Ballot storage ballot = ballots[_ballotId];
        uint positionCount = ballot.positions.length;
        string[] memory positionNames = new string[](positionCount);
        string[][] memory candidateNames = new string[][](positionCount);

        for (uint i = 0; i < positionCount; i++) {
            positionNames[i] = ballot.positions[i].name;
            uint candidateCount = ballot.positions[i].candidates.length;
            candidateNames[i] = new string[](candidateCount);

            for (uint j = 0; j < candidateCount; j++) {
                candidateNames[i][j] = ballot.positions[i].candidates[j].name;
            }
        }

        return (ballot.id, ballot.title, positionNames, candidateNames);
    }

    
    mapping(string => address[]) private ballotVoters; // Stores voter addresses per ballot


    function registerMultipleVoters(
    address[] memory _voterAddresses,
    string memory _ballotId,
    bytes32[] memory _hashedPasswords
) public {
    require(isAdminRegistered[msg.sender], "Only admins can register voters");
    require(bytes(_ballotId).length == 8, "Invalid Ballot ID");
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");
    require(_voterAddresses.length == _hashedPasswords.length, "Mismatched array lengths");

    for (uint i = 0; i < _voterAddresses.length; i++) {
        require(!registeredVoters[_voterAddresses[i]].isRegistered, "Voter already registered");

        registeredVoters[_voterAddresses[i]] = Voter(_hashedPasswords[i], _ballotId, true, false);
        ballotVoters[_ballotId].push(_voterAddresses[i]); // 🔹 Store voter address

        emit VoterRegistered(_voterAddresses[i], _ballotId);
    }
}
function getVotersForBallot(string memory _ballotId) public view returns (address[] memory) {
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");
    return ballotVoters[_ballotId]; // 🔹 Return list of voter addresses
}

function getResults(string memory _ballotId) 
    public 
    view 
    returns (string[] memory, string[][] memory, uint[][] memory) 
{
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");

    Ballot storage ballot = ballots[_ballotId];
    uint positionCount = ballot.positions.length;

    string[] memory positionNames = new string[](positionCount);
    string[][] memory candidateNames = new string[][](positionCount);
    uint[][] memory voteCounts = new uint[][](positionCount);

    for (uint i = 0; i < positionCount; i++) {
        positionNames[i] = ballot.positions[i].name;
        uint candidateCount = ballot.positions[i].candidates.length;

        candidateNames[i] = new string[](candidateCount);
        voteCounts[i] = new uint[](candidateCount);

        for (uint j = 0; j < candidateCount; j++) {
            candidateNames[i][j] = ballot.positions[i].candidates[j].name;
            voteCounts[i][j] = ballot.positions[i].candidates[j].voteCount;
        }
    }

    return (positionNames, candidateNames, voteCounts);
}

function isBallotClosed(string memory _ballotId) public view returns (bool) {
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");
    return ballots[_ballotId].isClosed;
}

event VotingEnded(string ballotId, address admin);

function endVoting(string memory _ballotId) public {
    require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");
    require(msg.sender == ballots[_ballotId].adminAddress, "Only the ballot creator can close voting");
    require(!ballots[_ballotId].isClosed, "Voting is already closed");

    ballots[_ballotId].isClosed = true;

    emit VotingEnded(_ballotId, msg.sender); // ✅ Emits event when voting ends
}


}
