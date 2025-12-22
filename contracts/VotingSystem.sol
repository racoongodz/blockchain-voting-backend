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
        string id;
        string title;
        address adminAddress;
        Position[] positions;
        bool isClosed;
    }

    struct Voter {
        bytes32 hashedPassword;
        string ballotId;
        bool isRegistered;
        bool hasVoted;
    }

    // Admin storage
    mapping(address => Admin) private admins;
    mapping(string => address) private usernameToAddress;
    mapping(address => bool) public isAdminRegistered;
    mapping(address => string[]) private adminBallots;

    // Ballot storage
    mapping(string => Ballot) public ballots;
    mapping(string => address[]) private ballotVoters; // Voters per ballot

    // Voter storage (ballot-specific)
    mapping(string => mapping(address => Voter)) public registeredVoters;

    // Voting tracking
    mapping(bytes32 => bool) private positionVotes;

    // Events
    event AdminRegistered(string username, address adminAddress);
    event BallotCreated(string ballotId, string title, address indexed admin);
    event VoterRegistered(address indexed voter, string ballotId);
    event VoteCasted(address indexed voter, string ballotId, uint positionIndex, uint candidateIndex);
    event VotingEnded(string ballotId, address admin);

    // ---------------- Admin functions ----------------
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

        uint ballotCount = adminBallots[adminAddr].length;
        string[] memory ballotIds = new string[](ballotCount);
        string[] memory ballotTitles = new string[](ballotCount);

        for (uint i = 0; i < ballotCount; i++) {
            string memory ballotId = adminBallots[adminAddr][i];
            ballotIds[i] = ballots[ballotId].id;
            ballotTitles[i] = ballots[ballotId].title;
        }

        return (true, ballotIds, ballotTitles);
    }

    // ---------------- Ballot functions ----------------
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

    // ---------------- Voter registration ----------------
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
            require(!registeredVoters[_ballotId][_voterAddresses[i]].isRegistered, 
                "Voter already registered for this ballot");

            registeredVoters[_ballotId][_voterAddresses[i]] = Voter({
                hashedPassword: _hashedPasswords[i],
                ballotId: _ballotId,
                isRegistered: true,
                hasVoted: false
            });

            ballotVoters[_ballotId].push(_voterAddresses[i]);
            emit VoterRegistered(_voterAddresses[i], _ballotId);
        }
    }

    function getVotersWithStatus(string memory _ballotId)
        public
        view
        returns (address[] memory, bool[] memory)
    {
        address[] memory voters = ballotVoters[_ballotId];
        bool[] memory votedStatus = new bool[](voters.length);

        for (uint i = 0; i < voters.length; i++) {
            votedStatus[i] = registeredVoters[_ballotId][voters[i]].hasVoted;
        }

        return (voters, votedStatus);
    }

    // ---------------- Voting ----------------
    function authenticateVoter(string memory _ballotId, string memory _password) 
        public view returns (bool isAuthenticated, bool hasVoted, string memory ballotId) 
    {
        require(bytes(_ballotId).length == 8, "Invalid Ballot ID");
        require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");

        Voter storage voter = registeredVoters[_ballotId][msg.sender];
        require(voter.isRegistered, "Voter not registered for any ballot");
        require(keccak256(abi.encodePacked(voter.ballotId)) == keccak256(abi.encodePacked(_ballotId)), "Ballot ID mismatch");
        require(voter.hashedPassword == keccak256(abi.encodePacked(_password)), "Incorrect password");

        return (true, voter.hasVoted, voter.ballotId);
    }

    function voteMultiple(string memory _ballotId, uint[] memory _positionIndexes, uint[] memory _candidateIndexes) public {
        require(bytes(ballots[_ballotId].id).length > 0, "Invalid ballot ID");
        require(!ballots[_ballotId].isClosed, "Voting has ended");

        Voter storage voter = registeredVoters[_ballotId][msg.sender];
        require(voter.isRegistered, "Voter not registered");
        require(!voter.hasVoted, "You have already completed voting");
        require(_positionIndexes.length == _candidateIndexes.length, "Invalid vote data");

        for (uint i = 0; i < _positionIndexes.length; i++) {
            bytes32 voteKey = keccak256(abi.encodePacked(msg.sender, _ballotId, _positionIndexes[i]));
            require(!positionVotes[voteKey], "Already voted for this position");

            ballots[_ballotId].positions[_positionIndexes[i]].candidates[_candidateIndexes[i]].voteCount++;
            positionVotes[voteKey] = true;
        }

        voter.hasVoted = true;
        emit VoteCasted(msg.sender, _ballotId, _positionIndexes[0], _candidateIndexes[0]);
    }

    // ---------------- Utilities ----------------
    function getMyBallots() public view returns (string[] memory, string[] memory) {
        uint ballotCount = adminBallots[msg.sender].length;
        string[] memory ballotIds = new string[](ballotCount);
        string[] memory ballotTitles = new string[](ballotCount);

        for (uint i = 0; i < ballotCount; i++) {
            string memory ballotId = adminBallots[msg.sender][i];
            ballotIds[i] = ballots[ballotId].id;
            ballotTitles[i] = ballots[ballotId].title;
        }

        return (ballotIds, ballotTitles);
    }

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

    function getResults(string memory _ballotId) 
        public view returns (string[] memory, string[][] memory, uint[][] memory) 
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

    function endVoting(string memory _ballotId) public {
        require(bytes(ballots[_ballotId].id).length > 0, "Ballot ID does not exist");
        require(msg.sender == ballots[_ballotId].adminAddress, "Only the ballot creator can close voting");
        require(!ballots[_ballotId].isClosed, "Voting is already closed");

        ballots[_ballotId].isClosed = true;
        emit VotingEnded(_ballotId, msg.sender);
    }
}
