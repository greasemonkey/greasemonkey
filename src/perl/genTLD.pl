#!/usr/bin/perl

use strict;

require Mail::SpamAssassin::Util::RegistrarBoundaries;

# import data from RegistrarBoundaries
my @VALID_TLD = keys( %Mail::SpamAssassin::Util::RegistrarBoundaries::VALID_TLDS );
my @TWO_LEVEL_DOMAINS = keys( %Mail::SpamAssassin::Util::RegistrarBoundaries::TWO_LEVEL_DOMAINS );
my @US_STATES = keys( %Mail::SpamAssassin::Util::RegistrarBoundaries::US_STATES );

# assemble the array of possiblities
my $state_regex = '.(?:' . join( '|', @US_STATES ) . ')';
my @all_domains = ( 'demon.co.uk',
                    'esc.edu.ar',
                    # .us domains are a pain ...
                    '(?:c[oi].)?[^.]' . $state_regex . '.us',
                    '[^.].(?:(?:pvt.)?k12|cc|tec|lib|state|gen)' . $state_regex . '.us',
                    '[^.].' . join( '|', @US_STATES ) . 'us' );
push( @all_domains, @VALID_TLD, @TWO_LEVEL_DOMAINS );
# Escape '.' a lot. Remember that
foreach( @all_domains ) {
    $_ =~ s/\./\\\\\./g;
}

print( '"(?:'. join( '|', @all_domains ) . ')"' . "\n" )
