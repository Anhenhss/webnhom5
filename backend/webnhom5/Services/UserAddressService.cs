public async Task AddAddress(UserAddress address)
{
    if (address.IsDefault)
    {
        var list = _context.UserAddresses
            .Where(x => x.UserId == address.UserId);

        foreach (var a in list)
            a.IsDefault = false;
    }

    _context.UserAddresses.Add(address);
    await _context.SaveChangesAsync();
}