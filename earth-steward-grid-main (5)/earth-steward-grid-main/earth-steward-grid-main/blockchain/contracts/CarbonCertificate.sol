// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CarbonCertificate
 * @dev ERC-721 NFT for Government of India Carbon Credit Certificates.
 *      Each certificate is minted directly to the recipient's wallet.
 *      The contract owner (backend minter wallet) is the only one who can mint.
 */
contract CarbonCertificate is ERC721URIStorage, Ownable {
    // Auto-incrementing token ID counter
    uint256 private _nextTokenId;

    /**
     * @dev Emitted when a certificate NFT is minted.
     * @param recipient The wallet address receiving the certificate NFT.
     * @param tokenId   The ERC-721 token ID assigned.
     * @param tokenURI  The IPFS URI pointing to the certificate metadata.
     */
    event CertificateIssued(
        address indexed recipient,
        uint256 indexed tokenId,
        string tokenURI
    );

    constructor() ERC721("CarbonCertificate", "CCERT") Ownable(msg.sender) {
        _nextTokenId = 1; // Start token IDs at 1
    }

    /**
     * @dev Mints a new certificate NFT directly to the recipient address.
     *      Can only be called by the contract owner (backend minter wallet).
     * @param recipient The wallet address to receive the certificate NFT.
     * @param uri       The IPFS URI for the certificate metadata JSON.
     * @return tokenId  The newly minted token ID.
     */
    function mintCertificate(
        address recipient,
        string memory uri
    ) external onlyOwner returns (uint256) {
        require(recipient != address(0), "CarbonCertificate: mint to zero address");
        require(bytes(uri).length > 0, "CarbonCertificate: empty token URI");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);

        emit CertificateIssued(recipient, tokenId, uri);

        return tokenId;
    }

    /**
     * @dev Returns the total number of certificates minted so far.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Returns the current next token ID (useful for previewing).
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
